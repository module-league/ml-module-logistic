using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace LogisticApi.Services
{
    /// <summary>
    /// Thrown by services for an expected failure (400, 404, 409); ApiProblemHandler turns it into a ProblemDetails response.
    /// </summary>
    public sealed class ApiProblemException(int status, string title, string? detail = null) : Exception(title)
    {
        public int Status { get; } = status;
        public string Title { get; } = title;
        public string? Detail { get; } = detail;

        public static ApiProblemException BadRequest(string title, string? detail = null) => new(StatusCodes.Status400BadRequest, title, detail);
        public static ApiProblemException NotFound(string title) => new(StatusCodes.Status404NotFound, title);
        public static ApiProblemException Conflict(string title, string? detail = null) => new(StatusCodes.Status409Conflict, title, detail);
    }

    public sealed class ApiProblemHandler(IProblemDetailsService problemDetails) : IExceptionHandler
    {
        public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
        {
            if (exception is not ApiProblemException problem) return false;

            httpContext.Response.StatusCode = problem.Status;
            return await problemDetails.TryWriteAsync(new ProblemDetailsContext
            {
                HttpContext = httpContext,
                Exception = exception,
                ProblemDetails = new ProblemDetails
                {
                    Status = problem.Status,
                    Title = problem.Title,
                    Detail = problem.Detail,
                },
            });
        }
    }
}
