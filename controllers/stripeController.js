const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const User = require('../models/User'); // Thêm dòng này
const { sendProSuccessMail } = require('../utils/mailer');

exports.createCheckoutSession = async (req, res) => {
  const { priceId, accountId } = req.body;
  try {
    const plan = priceId === 'price_1Rm9AB2YRwNdOTc31nG4iFvj' ? 'month' : 'year';
    const account = await Account.findById(accountId);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const now = new Date();
    let canBuy = true;
    let reason = '';
    if (account.proInfo && account.proInfo.isPro && account.proInfo.expireAt && new Date(account.proInfo.expireAt) > now) {
      const expireAt = new Date(account.proInfo.expireAt);
      const diffMs = expireAt - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (account.proInfo.plan === 'year') {
        if (diffDays > 3) {
          canBuy = false;
          reason = 'Bạn đã có gói Pro năm còn hạn. Chỉ được mua lại khi còn 3 ngày nữa hết hạn.';
        }
      } else if (account.proInfo.plan === 'month') {
        if (plan === 'month' && diffDays > 3) {
          canBuy = false;
          reason = 'Bạn đã có gói Pro tháng còn hạn. Chỉ được mua lại khi còn 3 ngày nữa hết hạn.';
        }
      }
    }
    if (!canBuy) return res.status(400).json({ error: reason });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'http://18.212.15.44:5000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://18.212.15.44:5000/cancel',
      metadata: {
        accountId,
        plan,
      },
    });

    // Lưu transaction với trạng thái pending
    await Transaction.create({
      accountId,
      sessionId: session.id,
      plan,
      amount: session.amount_total || 0, // Luôn lưu đơn vị nhỏ nhất
      displayAmount: session.amount_total / (session.currency === 'vnd' ? 1 : 100),
      currency: session.currency || 'vnd',
      status: 'pending',
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.verifySession = async (req, res) => {
  const { sessionId } = req.body;
  try {
    // Kiểm tra transaction đã xác nhận chưa
    const transaction = await Transaction.findOne({ sessionId });
    if (transaction && transaction.status === 'paid') {
      // Đã xác nhận rồi, không cập nhật lại nữa
      return res.json({ success: true, message: 'Session already verified' });
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      const accountId = session.metadata.accountId;
      const plan = session.metadata.plan || 'month';
      const account = await Account.findById(accountId);
      const user = account && account.userId ? await User.findById(account.userId) : null;
      const email = (account && account.email) || (user && user.email);
      const fullName = (user && user.fullName) || (account && account.username);
      let now = new Date();
      let expireDate = new Date(now); // Tạo bản sao mới thay vì dùng cùng object
      let daysLeft = 0;
      if (account.proInfo && account.proInfo.isPro && account.proInfo.expireAt && new Date(account.proInfo.expireAt) > now) {
        // Cộng dồn số ngày còn lại
        const oldExpire = new Date(account.proInfo.expireAt);
        daysLeft = Math.ceil((oldExpire - now) / (1000 * 60 * 60 * 24));
        expireDate = new Date(oldExpire); // Tạo bản sao mới
      }
      if (plan === 'month') expireDate.setMonth(expireDate.getMonth() + 1);
      else if (plan === 'year') expireDate.setFullYear(expireDate.getFullYear() + 1);
      // Nếu còn hạn thì expireDate đã là oldExpire + thời gian mới
      await Account.findByIdAndUpdate(accountId, {
        'proInfo.isPro': true,
        'proInfo.plan': plan,
        'proInfo.expireAt': expireDate,
        'proInfo.activatedAt': now,
      });
      // Gửi email xác nhận Pro thành công
      try {
        if (email) {
          await sendProSuccessMail(email, fullName, plan, expireDate);
        }
      } catch (mailErr) {
        console.error('Lỗi gửi mail xác nhận Pro:', mailErr);
      }
      // Cập nhật transaction thành paid
      await Transaction.findOneAndUpdate(
        { sessionId },
        {
          status: 'paid',
          amount: session.amount_total || 0,
          displayAmount: session.amount_total / (session.currency === 'vnd' ? 1 : 100),
          currency: session.currency || 'vnd',
          paymentMethod: session.payment_method_types ? session.payment_method_types[0] : undefined,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        }
      );
      return res.json({ success: true });
    } else {
      return res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getProRevenueStats = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      status: 'paid',
      plan: { $in: ['month', 'year'] }
    }, {
      accountId: 1,
      amount: 1,
      currency: 1,
      createdAt: 1,
      plan: 1
    });
    res.json({ data: transactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}; 