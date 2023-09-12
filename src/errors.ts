export class CustomError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class BadRequest extends CustomError {
  constructor(message?: string) {
    const errorMessage = message || "Invalid parameters. Please check your request and try again.";
    super(errorMessage, 400);
  }
}

export class NotFound extends CustomError {
  constructor(message?: string) {
    const errorMessage = message || "The requested resource was not found.";
    super(errorMessage, 404);
  }
}

export class Conflict extends CustomError {
  constructor(message?: string) {
    const errorMessage = message || "The request could not be processed because of conflict in the request.";
    super(errorMessage, 409);
  }
}

export class InternalServerError extends CustomError {
  constructor(message?: string) {
    const errorMessage = message || "Internal server error.";
    super(errorMessage, 500);
  }
}
