export const validateUserRegistration = (req, res, next) => {
  const { firstName, lastName, email, age, contactNumber, gender } = req.body;
  if (!firstName || !lastName || !email || !age || !contactNumber || !gender) {
    return res.status(400).json({ 
      success: false, 
      message: "All fields are required." 
    });
  }
  next();
};

export const validateHealthData = (req, res, next) => {
  const { heartRate, SpO2, weight } = req.body;
  if (!heartRate && !SpO2 && !weight) {
    return res.status(400).json({ 
      success: false, 
      message: "No data provided." 
    });
  }
  next();
};

export const validateDeviceStatus = (req, res, next) => {
  const { deviceId, status } = req.body;
  if (!deviceId || !status) {
    return res.status(400).json({ 
      success: false, 
      message: "Device ID and status are required." 
    });
  }
  next();
};