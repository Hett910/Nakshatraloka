// FOR SENDING RESPONSE OF THE API TO THE USER/FRONTEND
const correctResponse = ({ res, statusCode, msg, data }) => {
  res.json({
    Status: statusCode,
    Message: msg,
    Data: data,
  });
}



// DECLARING VARIABLE FOR COMMON FUNCTIONING
const statusCode = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTH_INFO: 203,
  NO_CONTENT: 204,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  METHOD_NOT_ALLOWED: 405,
  LENGTH_REQUIRED: 411,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUEST: 429,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// DECLARING MESSAGES FOR DIFFERENT RESPONSE
const messageResponse = {
  LOGIN: "Login Successful",
  NOT_FOUND: "Data Not Found",
  FORBIDDEN: "Access Forbidden",
  SOMETHING_WRONG: "Something Went Wrong",
  ADDED: "Data Added Successfully",
  DATA_FETCHED: "Data Fetched Successfully",
  UPDATED: "Data Updated Successfully",
  DELETED: "Data Deleted Successfully",
  ADMIN_EXPIRED: "Admin Session Expired",
  ADMIN_REFRESH: "Admin Refresh Token Expired",
  USER_EXPIRED: "User Session Expired",
  USER_REFRESH: "User Refresh Token Expired",
  TOKEN_REFRESH: "Token Refreshed",
  USER_NOT_FOUND: "Username/Password Invalid",
  NOT_AUTHORIZED: "Not Authorized",
  ACCOUNT_NOT_FOUND: "Account Not Found",
  ACCOUNT_EXIST: "Account Already Exist",
  BAD_REQUEST: "Bad Request",
  MEMBER_EXIST: "Member Already Exist",
  DATA_EXPORT: "Data Export Successfully",
};

module.exports = {
  correctResponse,
  statusCode,
  messageResponse,
};
