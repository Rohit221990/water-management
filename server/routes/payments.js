import express from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { authenticateToken } from './auth.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Plumber from '../models/Plumber.js';


const router = express.Router();

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...');

// @route   POST /api/payments/create-intent
// @desc    Create payment intent for service payment
// @access  Private (Staff only)
router.post('/create-intent', authenticateToken, [
  body('serviceId').notEmpty().withMessage('Service ID is required'),
  body('amount').isNumeric().withMessage('Valid amount required'),
  body('currency').optional().isString().withMessage('Valid currency required')
], async (req, res) => {
  try {
    if (req.userType !== 'staff') {
      return res.status(403).json({ message: 'Only staff can initiate payments' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { serviceId, amount, currency = 'usd', paymentMethod = 'company_account' } = req.body;

    // Validate service request
    const service = await ServiceRequest.findById(serviceId)
      .populate('assignedPlumber', 'name businessName bankDetails')
      .populate('leak', 'title location');

    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    if (service.status !== 'work_completed' && service.status !== 'verified') {
      return res.status(400).json({ message: 'Payment can only be made for completed work' });
    }

    if (service.payment.status === 'completed') {
      return res.status(400).json({ message: 'Payment already completed for this service' });
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      currency: currency,
      metadata: {
        serviceId: serviceId,
        plumberId: service.assignedPlumber._id.toString(),
        requestedBy: req.user._id.toString(),
        leakTitle: service.leak.title
      },
      description: `Payment for plumbing service: ${service.leak.title}`,
      receipt_email: req.user.email
    });

    // Update service payment status
    service.payment.method = paymentMethod;
    service.payment.status = 'processing';
    service.payment.transactionId = paymentIntent.id;
    await service.save();

    res.json({
      message: 'Payment intent created successfully',
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      currency: currency
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Server error while creating payment intent' });
  }
});

// @route   POST /api/payments/confirm
// @desc    Confirm payment completion
// @access  Private
router.post('/confirm', authenticateToken, [
  body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required'),
  body('serviceId').notEmpty().withMessage('Service ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentIntentId, serviceId } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not successful' });
    }

    // Update service request
    const service = await ServiceRequest.findById(serviceId)
      .populate('assignedPlumber');

    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Update payment status
    service.payment.status = 'completed';
    service.payment.paidAt = new Date();
    await service.save();

    // Update service status to closed if verified
    if (service.status === 'verified') {
      await service.updateStatus('closed', req.user._id, req.userType, 'Payment completed and service closed');
    }

    // Emit payment notification to plumber
    const io = req.app.get('io');
    io.to(`plumber-${service.assignedPlumber._id}`).emit('payment-received', {
      serviceId: service._id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      timestamp: new Date()
    });

    res.json({
      message: 'Payment confirmed successfully',
      payment: {
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        status: 'completed',
        paidAt: service.payment.paidAt
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ message: 'Server error while confirming payment' });
  }
});

// @route   POST /api/payments/webhook
// @desc    Handle Stripe webhook events
// @access  Public (Stripe webhook)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const serviceId = paymentIntent.metadata.serviceId;
        
        if (serviceId) {
          const service = await ServiceRequest.findById(serviceId);
          if (service && service.payment.status === 'processing') {
            service.payment.status = 'completed';
            service.payment.paidAt = new Date();
            await service.save();

            // Emit real-time notification
            const io = req.app.get('io');
            io.to(`plumber-${paymentIntent.metadata.plumberId}`).emit('payment-confirmed', {
              serviceId: serviceId,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency
            });
          }
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        const failedServiceId = failedPayment.metadata.serviceId;
        
        if (failedServiceId) {
          const service = await ServiceRequest.findById(failedServiceId);
          if (service) {
            service.payment.status = 'failed';
            await service.save();

            // Emit failure notification
            const io = req.app.get('io');
            io.to(`staff-${failedPayment.metadata.requestedBy}`).emit('payment-failed', {
              serviceId: failedServiceId,
              error: failedPayment.last_payment_error?.message
            });
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook handling error:', error);
    res.status(500).json({ message: 'Error handling webhook' });
  }
});

// @route   POST /api/payments/refund
// @desc    Process refund for a service payment
// @access  Private (Admin only)
router.post('/refund', authenticateToken, [
  body('serviceId').notEmpty().withMessage('Service ID is required'),
  body('reason').notEmpty().withMessage('Refund reason is required'),
  body('amount').optional().isNumeric().withMessage('Valid refund amount required')
], async (req, res) => {
  try {
    if (req.userType !== 'staff' || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can process refunds' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { serviceId, reason, amount } = req.body;

    const service = await ServiceRequest.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    if (service.payment.status !== 'completed') {
      return res.status(400).json({ message: 'Can only refund completed payments' });
    }

    if (!service.payment.transactionId) {
      return res.status(400).json({ message: 'No transaction ID found for refund' });
    }

    // Process refund through Stripe
    const refundAmount = amount ? Math.round(amount * 100) : undefined; // If amount specified, use it, otherwise full refund

    const refund = await stripe.refunds.create({
      payment_intent: service.payment.transactionId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        serviceId: serviceId,
        refundReason: reason,
        processedBy: req.user._id.toString()
      }
    });

    // Update service payment status
    service.payment.status = 'refunded';
    service.payment.refundedAt = new Date();
    service.payment.refundReason = reason;
    
    // Update cancellation info
    service.cancellation.refundIssued = true;
    
    await service.save();

    // Emit refund notification
    const io = req.app.get('io');
    io.to(`staff-${service.requestedBy}`).emit('refund-processed', {
      serviceId: service._id,
      amount: refund.amount / 100,
      reason: reason,
      timestamp: new Date()
    });

    res.json({
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: reason
      }
    });

  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({ message: 'Server error while processing refund' });
  }
});

// @route   GET /api/payments/service/:id
// @desc    Get payment information for a service
// @access  Private
router.get('/service/:id', authenticateToken, async (req, res) => {
  try {
    const service = await ServiceRequest.findById(req.params.id)
      .select('payment pricing')
      .populate('assignedPlumber', 'name businessName');

    if (!service) {
      return res.status(404).json({ message: 'Service request not found' });
    }

    // Check permissions
    const canView = (req.userType === 'staff') || 
                   (req.userType === 'plumber' && 
                    service.assignedPlumber && 
                    service.assignedPlumber._id.toString() === req.user._id.toString());

    if (!canView) {
      return res.status(403).json({ message: 'Not authorized to view payment information' });
    }

    // If there's a Stripe payment intent, get updated status
    if (service.payment.transactionId && service.payment.status === 'processing') {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(service.payment.transactionId);
        
        if (paymentIntent.status === 'succeeded' && service.payment.status !== 'completed') {
          service.payment.status = 'completed';
          service.payment.paidAt = new Date();
          await service.save();
        } else if (paymentIntent.status === 'failed') {
          service.payment.status = 'failed';
          await service.save();
        }
      } catch (stripeError) {
        console.error('Error fetching payment intent:', stripeError);
      }
    }

    res.json({
      payment: service.payment,
      pricing: service.pricing,
      plumber: service.assignedPlumber ? {
        name: service.assignedPlumber.name,
        businessName: service.assignedPlumber.businessName
      } : null
    });

  } catch (error) {
    console.error('Get payment info error:', error);
    res.status(500).json({ message: 'Server error while fetching payment information' });
  }
});

// @route   GET /api/payments/dashboard
// @desc    Get payment dashboard data
// @access  Private (Staff only)
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'staff') {
      return res.status(403).json({ message: 'Only staff can view payment dashboard' });
    }

    const { period = '30' } = req.query; // Default to last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get payment statistics
    const totalPayments = await ServiceRequest.countDocuments({
      'payment.status': 'completed',
      'payment.paidAt': { $gte: startDate }
    });

    const pendingPayments = await ServiceRequest.countDocuments({
      status: { $in: ['work_completed', 'verified'] },
      'payment.status': { $in: ['pending', 'processing'] }
    });

    const failedPayments = await ServiceRequest.countDocuments({
      'payment.status': 'failed',
      'payment.paidAt': { $gte: startDate }
    });

    // Calculate total revenue
    const revenueData = await ServiceRequest.aggregate([
      {
        $match: {
          'payment.status': 'completed',
          'payment.paidAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averagePayment: { $avg: '$pricing.totalAmount' }
        }
      }
    ]);

    const revenue = revenueData.length > 0 ? revenueData[0] : { totalRevenue: 0, averagePayment: 0 };

    // Get top performing plumbers by revenue
    const topPlumbers = await ServiceRequest.aggregate([
      {
        $match: {
          'payment.status': 'completed',
          'payment.paidAt': { $gte: startDate },
          assignedPlumber: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$assignedPlumber',
          totalEarnings: { $sum: '$pricing.totalAmount' },
          completedJobs: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'plumbers',
          localField: '_id',
          foreignField: '_id',
          as: 'plumber'
        }
      },
      {
        $unwind: '$plumber'
      },
      {
        $project: {
          name: '$plumber.name',
          businessName: '$plumber.businessName',
          totalEarnings: 1,
          completedJobs: 1
        }
      },
      {
        $sort: { totalEarnings: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      dashboard: {
        summary: {
          totalPayments,
          pendingPayments,
          failedPayments,
          totalRevenue: revenue.totalRevenue || 0,
          averagePayment: Math.round(revenue.averagePayment || 0)
        },
        topPlumbers,
        period: `${period} days`
      }
    });

  } catch (error) {
    console.error('Get payment dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching payment dashboard' });
  }
});

// @route   GET /api/payments/plumber/earnings
// @desc    Get plumber earnings summary
// @access  Private (Plumber only)
router.get('/plumber/earnings', authenticateToken, async (req, res) => {
  try {
    if (req.userType !== 'plumber') {
      return res.status(403).json({ message: 'Only plumbers can view earnings' });
    }

    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get earnings data
    const earnings = await ServiceRequest.aggregate([
      {
        $match: {
          assignedPlumber: req.user._id,
          'payment.status': 'completed',
          'payment.paidAt': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$pricing.totalAmount' },
          completedJobs: { $sum: 1 },
          averageJobValue: { $avg: '$pricing.totalAmount' },
          laborEarnings: { $sum: '$pricing.laborCost' },
          materialEarnings: { $sum: '$pricing.materialsCost' }
        }
      }
    ]);

    const pendingEarnings = await ServiceRequest.aggregate([
      {
        $match: {
          assignedPlumber: req.user._id,
          status: { $in: ['work_completed', 'verified'] },
          'payment.status': { $in: ['pending', 'processing'] }
        }
      },
      {
        $group: {
          _id: null,
          pendingAmount: { $sum: '$pricing.totalAmount' },
          pendingJobs: { $sum: 1 }
        }
      }
    ]);

    const result = earnings.length > 0 ? earnings[0] : {
      totalEarnings: 0,
      completedJobs: 0,
      averageJobValue: 0,
      laborEarnings: 0,
      materialEarnings: 0
    };

    const pending = pendingEarnings.length > 0 ? pendingEarnings[0] : {
      pendingAmount: 0,
      pendingJobs: 0
    };

    res.json({
      earnings: {
        ...result,
        ...pending,
        period: `${period} days`
      }
    });

  } catch (error) {
    console.error('Get plumber earnings error:', error);
    res.status(500).json({ message: 'Server error while fetching earnings' });
  }
});

export default router;
