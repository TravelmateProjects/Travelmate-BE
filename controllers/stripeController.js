const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

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
      success_url: 'http://192.168.48.248:5000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'http://192.168.48.248:5000/cancel',
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
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      const accountId = session.metadata.accountId;
      const plan = session.metadata.plan || 'month';
      const account = await Account.findById(accountId);
      let now = new Date();
      let expireDate = now;
      let daysLeft = 0;
      if (account.proInfo && account.proInfo.isPro && account.proInfo.expireAt && new Date(account.proInfo.expireAt) > now) {
        // Cộng dồn số ngày còn lại
        const oldExpire = new Date(account.proInfo.expireAt);
        daysLeft = Math.ceil((oldExpire - now) / (1000 * 60 * 60 * 24));
        expireDate = oldExpire;
      }
      if (plan === 'month') expireDate.setMonth(expireDate.getMonth() + 1);
      else if (plan === 'year') expireDate.setFullYear(expireDate.getFullYear() + 1);
      // Nếu còn hạn thì expireDate đã là oldExpire + thời gian mới
      await Account.findByIdAndUpdate(accountId, {
        'proInfo.isPro': true,
        'proInfo.plan': plan,
        'proInfo.expireAt': expireDate,
      });
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