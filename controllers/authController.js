const ShopCustomer = require('../models/ShopCustomer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'aloshipp-bakery-secret-key-2026';

exports.register = async (req, res) => {
  try {
    const { name, phone, password, address, location } = req.body;
    
    if (!name || !phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ tên, số điện thoại và mật khẩu' });
    }

    const existingCustomer = await ShopCustomer.findOne({ phone });
    if (existingCustomer) {
      if (existingCustomer.password) {
        return res.status(400).json({ success: false, message: 'Số điện thoại này đã được đăng ký' });
      } else {
        const salt = await bcrypt.genSalt(10);
        existingCustomer.password = await bcrypt.hash(password, salt);
        existingCustomer.name = name;
        if (address) existingCustomer.address = address;
        if (location) existingCustomer.location = location;
        await existingCustomer.save();
        const token = jwt.sign({ id: existingCustomer._id }, JWT_SECRET, { expiresIn: '30d' });
        return res.status(201).json({
          success: true,
          message: 'Đăng ký thành công',
          data: { token, customer: { _id: existingCustomer._id, name: existingCustomer.name, phone: existingCustomer.phone, address: existingCustomer.address, location: existingCustomer.location } }
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = new ShopCustomer({
      name,
      phone,
      password: hashedPassword,
      address,
      location
    });

    await customer.save();

    const token = jwt.sign({ id: customer._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: { token, customer: { _id: customer._id, name: customer.name, phone: customer.phone, address: customer.address, location: customer.location } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại và mật khẩu' });
    }

    const customer = await ShopCustomer.findOne({ phone });
    if (!customer) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không tồn tại' });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu không chính xác' });
    }

    const token = jwt.sign({ id: customer._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: { token, customer: { _id: customer._id, name: customer.name, phone: customer.phone, address: customer.address, location: customer.location } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const customer = await ShopCustomer.findById(req.customerId).select('-password');
    if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, address, location, oldPassword, newPassword } = req.body;
    
    const customer = await ShopCustomer.findById(req.customerId);
    if (!customer) return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });

    if (name) customer.name = name;
    if (address) customer.address = address;
    if (location) customer.location = location;

    if (oldPassword && newPassword) {
      const isMatch = await bcrypt.compare(oldPassword, customer.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Mật khẩu cũ không chính xác' });
      }
      const salt = await bcrypt.genSalt(10);
      customer.password = await bcrypt.hash(newPassword, salt);
    }

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: { _id: customer._id, name: customer.name, phone: customer.phone, address: customer.address, location: customer.location }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await ShopCustomer.findByIdAndDelete(req.customerId);
    res.status(200).json({ success: true, message: 'Tài khoản đã được xóa thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
