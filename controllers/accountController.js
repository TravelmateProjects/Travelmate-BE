const Account = require('../models/Account');
const Transaction = require('../models/Transaction');

exports.getProStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const account = await Account.findOne({ userId });
    if (!account) return res.status(404).json({ message: 'Account not found' });

    // Kiểm tra transaction thành công gần nhất
    const paidTransaction = await Transaction.findOne({
      accountId: account._id,
      status: 'paid'
    }).sort({ createdAt: -1 });

    if (paidTransaction) {
      let expireDate = new Date();
      if (
        !account.proInfo ||
        !account.proInfo.isPro ||
        !account.proInfo.expireAt ||
        new Date(account.proInfo.expireAt) < new Date()
      ) {
        // Tính ngày hết hạn mới
        if (paidTransaction.plan === 'month') expireDate.setMonth(expireDate.getMonth() + 1);
        else if (paidTransaction.plan === 'year') expireDate.setFullYear(expireDate.getFullYear() + 1);

        account.proInfo = {
          isPro: true,
          plan: paidTransaction.plan,
          expireAt: expireDate,
          activatedAt: new Date() // cập nhật ngày gia hạn/mua mới
        };
        await account.save();
      }
    }

    res.json({ proInfo: account.proInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAccountByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const account = await require('../models/Account').findOne({ userId });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    res.json({ data: account });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.find();
    res.json({ data: accounts });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllProAccounts = async (req, res) => {
  try {
    const proAccounts = await Account.find({
      'proInfo.isPro': true,
      'proInfo.activatedAt': { $exists: true, $ne: null }
    }, {
      'proInfo.activatedAt': 1,
      'proInfo.plan': 1,
      'proInfo.expireAt': 1,
      userId: 1,
      username: 1
    });
    res.json({ data: proAccounts });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
}; 