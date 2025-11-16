// X402 Protected API Route
// This endpoint requires payment before access
import type { NextApiRequest, NextApiResponse } from "next";

type ProtectedData = {
  message: string;
  data: {
    timestamp: string;
    secret: string;
  };
};

type ErrorResponse = {
  error: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProtectedData | ErrorResponse>,
) {
  // If the request reaches here, payment has been verified by the middleware

  if (req.method === 'GET') {
    res.status(200).json({
      message: "Access granted! Payment verified.",
      data: {
        timestamp: new Date().toISOString(),
        secret: "This is protected content that required payment to access!"
      }
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
