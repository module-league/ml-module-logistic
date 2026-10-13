import axios from "axios";

interface ServiceErrorResponse {
  statusCode?: number;
  /**
   * Generic message by server.
   * Use this if you dont need to display different user friendly message
   */
  message: string;
  /**
   * Exception name, this allows us to differentiate error types
   * Useful for customizing error message
   */
  exceptionName: string;
  isKnownError: boolean;
  /**
   * Set of model validation errors if any.
   * With the model property name as key, and the errors as value
   *
   * Example:
   * ```json
   * {
   *  "propName": ["Invalid data", "FooBar"]
   * }
   * ```
   */
  errors: {
    [propertyName: string]: string[];
  };
  /** ASP.NET ProblemDetails, e.g. "Field name already used." */
  title?: string;
  /** ASP.NET ProblemDetails, e.g. "A field named 'Carrier' already exists in this sidebar." */
  detail?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function errorParser(error: any) {
  let _err: ServiceErrorResponse = {
    message: `${error}`,
    exceptionName: "",
    errors: {},
    isKnownError: false,
  };

  if (error === undefined || error === null) {
    return undefined;
  } else if (axios.isAxiosError(error)) {
    const serverRespData = error.response?.data as
      ServiceErrorResponse | undefined;

    const problem = serverRespData?.detail ?? serverRespData?.title;

    if (error.response?.status === 400) {
      _err.message =
        Object.values(serverRespData?.errors ?? {})?.[0]?.[0] ??
        problem ??
        "Invalid input was sent";
      _err.exceptionName = "BadRequest";
      _err.errors = serverRespData?.errors ?? {};
    } else if (typeof problem === "string") {
      _err.message = problem;
    } else if (typeof serverRespData?.message === "string") {
      _err.message = serverRespData?.message;
    } else {
      _err.message = error.message;
      _err.exceptionName = error.stack ?? "";
    }

    _err.isKnownError =
      serverRespData?.isKnownError ?? typeof problem === "string";
    _err.statusCode = error.response?.status;
  } else if (error instanceof Error) {
    _err = {
      message: error.message,
      exceptionName: "",
      errors: {},
      isKnownError: true,
    };
  } else if (typeof error === "string") {
    _err = {
      message: error,
      exceptionName: "",
      errors: {},
      isKnownError: true,
    };
  }

  return _err;
}

/**
 * Simple hook to parse any given error to standard format.
 * Especially server error emitted from axios
 *
 * You can directly import `errorParser` if dont like having extra hook to pollute your code
 */
export default function useErrorParser() {
  return errorParser;
}
