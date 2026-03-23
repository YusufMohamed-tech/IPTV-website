import speakeasy from "speakeasy";
import QRCode from "qrcode";
import User from "../models/User.js";
import { signToken } from "../utils/token.js";
import { logActivity } from "../services/activityService.js";

export const login = async (req, res, next) => {
  try {
    const { email, password, otp, deviceInfo = "web" } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password +twoFactorSecret");
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.role === "admin" && user.twoFactorEnabled) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: otp || ""
      });

      if (!verified) {
        return res.status(401).json({ message: "Invalid or missing 2FA code" });
      }
    }

    user.lastLoginAt = new Date();
    user.lastLoginDevice = deviceInfo;
    await user.save();

    const token = signToken(user._id, user.role);

    await logActivity({
      actorId: user._id,
      actorRole: user.role,
      action: "auth.login",
      targetType: "user",
      targetId: user._id,
      details: { deviceInfo }
    });

    res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        credits: user.credits,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
      credits: req.user.credits,
      twoFactorEnabled: req.user.twoFactorEnabled,
      parentReseller: req.user.parentReseller
    }
  });
};

export const setupTwoFactor = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can enable 2FA" });
    }

    const secret = speakeasy.generateSecret({ name: `IPTV Admin (${req.user.email})` });
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    await User.findByIdAndUpdate(req.user._id, { twoFactorSecret: secret.base32 });

    res.json({
      secret: secret.base32,
      qrCodeDataUrl,
      message: "Scan QR and verify OTP to enable 2FA"
    });
  } catch (error) {
    next(error);
  }
};

export const verifyTwoFactor = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id).select("+twoFactorSecret");

    if (!user?.twoFactorSecret) {
      return res.status(400).json({ message: "2FA is not initialized" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token || ""
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.twoFactorEnabled = true;
    await user.save();

    await logActivity({
      actorId: user._id,
      actorRole: user.role,
      action: "auth.2fa.enabled",
      targetType: "user",
      targetId: user._id
    });

    res.json({ message: "2FA enabled successfully" });
  } catch (error) {
    next(error);
  }
};
