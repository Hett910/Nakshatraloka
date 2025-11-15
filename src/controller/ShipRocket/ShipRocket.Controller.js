const axios = require("axios");

const getShiprocketToken = async (req, res) => {
  try {
    const response = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
      email: `${process.env.SHIP_ROCKET_EMAIL}`, // your API user email
      password: `${process.env.SHIP_ROCKET_PASSWORD}` // the one you set
      
    });

    

    console.log("✅ Token generated successfully!");
    console.log(response.data.token); // save this for reuse (valid ~10 days)
    return response.data.token;
  } catch (error) {
    console.error("❌ Error generating token:", error.response?.data || error.message);
    return (
      error.response?.data || error.message
    )
  }
}

module.exports = { ShipRocket: { getShiprocketToken } };