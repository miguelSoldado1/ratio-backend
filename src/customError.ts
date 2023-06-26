import type { NextFunction, Request, Response } from "express";

export class CustomError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorHandlerMiddleware = (error: Error | CustomError, req: Request, res: Response, next: NextFunction) => {
  let statusCode = 500; // Default status code for internal server errors
  if (error instanceof CustomError) {
    statusCode = error.statusCode; // Use custom status code if available
  }

  res.status(statusCode).send({ message: error.message, status: statusCode });
  return next();
};
