const userRepository = require('../repositories/userRepository');
const { successResponse } = require('../utils/apiResponse');

async function getCustomers(req, res, next) {
  try {
    const { search = '' } = req.query;
    // Get users with role CUSTOMER.
    const { users } = await userRepository.listUsers({
      role: 'CUSTOMER',
      page: 1,
      limit: 100, // Fetch up to 100 customers for the directory
      search
    });

    // Sanitize the response to ensure no personal information (like email, phone) or private data leaks.
    const sanitizedCustomers = users.map(user => ({
      id: user.id,
      first_name: user.first_name,
      // Only provide the first initial of the last name for privacy
      last_name: user.last_name ? user.last_name.charAt(0) + '.' : '',
      avatar_url: user.avatar_url,
      created_at: user.created_at
    }));

    return successResponse(res, sanitizedCustomers, 'Public customers retrieved successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCustomers
};
