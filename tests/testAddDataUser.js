const mongoose = require('mongoose');
const User = require('../models/User'); // Đảm bảo đường dẫn này đúng với vị trí file user.model.js của bạn

async function addSampleUsers() {
  try {
    // Dữ liệu mẫu người dùng
    const sampleUsers = [
      {
        fullName: 'Nguyen Van A',
        email: 'a.nguyen@example.com',
        DOB: new Date('1990-05-15'),
        job: 'Kỹ sư phần mềm',
        phone: '0901234567',
        address: '123 Đường ABC, Quận XYZ, Hà Nội',
        hometown: 'Hà Nội',
        cccd: '0123456789',
        hobbies: ['Đọc sách', 'Du lịch', 'Chơi thể thao'],
        description: 'Một kỹ sư phần mềm năng động và yêu thích công nghệ.',
        rate: 4.5,
        avatar: 'https://res.cloudinary.com/your_cloud_name/image/upload/v16xxxxxxxx/default_avatar.png', // Thay bằng URL thực tế
        coverImage: 'https://res.cloudinary.com/your_cloud_name/image/upload/v16xxxxxxxx/default_cover.png', // Thay bằng URL thực tế
        travelStatus: true,
        currentLocation: 'Hồ Chí Minh',
        payment: 'Visa',
        connections: [],
        title: 'Senior Developer'
      },
      {
        fullName: 'Tran Thi B',
        email: 'b.tran@example.com',
        DOB: new Date('1995-08-20'),
        job: 'Nhân viên Marketing',
        phone: '0987654321',
        address: '456 Đường DEF, Quận UVW, Hồ Chí Minh',
        hometown: 'Huế',
        cccd: '9876543210',
        hobbies: ['Nghe nhạc', 'Xem phim', 'Nấu ăn'],
        description: 'Một nhân viên marketing sáng tạo và nhiệt huyết.',
        rate: 4.8,
        avatar: 'https://res.cloudinary.com/your_cloud_name/image/upload/v16xxxxxxxx/another_avatar.png', // Thay bằng URL thực tế
        coverImage: 'https://res.cloudinary.com/your_cloud_name/image/upload/v16xxxxxxxx/another_cover.png', // Thay bằng URL thực tế
        travelStatus: false,
        currentLocation: 'Hồ Chí Minh',
        payment: 'MasterCard',
        connections: [],
        title: 'Marketing Specialist'
      },
      {
        fullName: 'Le Van C',
        email: 'c.le@example.com',
        DOB: new Date('1992-03-10'),
        job: 'Giáo viên',
        phone: '0933333333',
        address: '789 Đường GHI, Quận RST, Đà Nẵng',
        hometown: 'Đà Nẵng',
        cccd: '1112223334',
        hobbies: ['Đọc sách', 'Leo núi', 'Dạy học'],
        description: 'Một giáo viên tận tâm và yêu nghề.',
        rate: 4.9,
        avatar: 'https://res.cloudinary.com/your_cloud_name/image/upload/v16xxxxxxxx/teacher_avatar.png', // Thay bằng URL thực tế
        coverImage: 'https://res.cloudinary.com/your_cloud_name/image/upload/v16xxxxxxxx/teacher_cover.png', // Thay bằng URL thực tế
        travelStatus: true,
        currentLocation: 'Hà Nội',
        payment: 'Paypal',
        connections: [],
        title: 'High School Teacher'
      }
      // Bạn có thể thêm nhiều đối tượng người dùng mẫu khác vào đây
    ];

    // Thêm nhiều người dùng vào cơ sở dữ liệu
    const createdUsers = await User.insertMany(sampleUsers);
    console.log('Đã thêm thành công dữ liệu mẫu người dùng:', createdUsers);
  } catch (error) {
    console.error('Lỗi khi thêm dữ liệu mẫu người dùng:', error);
  } finally {
    mongoose.disconnect(); // Đóng kết nối sau khi hoàn thành
  }
}

// Kết nối đến MongoDB (thay YOUR_MONGODB_URI bằng URI kết nối thực tế của bạn)
mongoose.connect('yourMongoUri', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Đã kết nối đến MongoDB');
    addSampleUsers();
  })
  .catch(err => console.error('Không thể kết nối đến MongoDB', err));