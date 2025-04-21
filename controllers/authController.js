const Account = require('../models/Account');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { fullName, email, username, password } = req.body;

  try {
    const existingEmail = await User.findOne({ email });
    const existingUsername = await Account.findOne({ username });

    if (existingEmail || existingUsername) {
      return res.status(400).json({ message: 'Email or username already exists.' });
    }

    const newUser = new User({ fullName, email });
    await newUser.save();

    const newAccount = new Account({ username, password, userId: newUser._id });
    await newAccount.save();

    const token = jwt.sign(
      { accountId: newAccount._id, userId: newUser._id, role: newAccount.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Registration successful', token, account: newAccount, user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const account = await Account.findOne({ username }).populate('userId');
    if (!account || !account.accountStatus) return res.status(401).json({ message: 'Invalid login information' });

    const isMatch = await account.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    const token = jwt.sign(
      { accountId: account._id, userId: account.userId._id, role: account.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      account: {
        id: account._id,
        username: account.username,
        role: account.role,
        userId: account.userId._id,
      },
      user: account.userId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
