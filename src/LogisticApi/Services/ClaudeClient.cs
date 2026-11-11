using Anthropic;
using Anthropic.Exceptions;
using Anthropic.Models.Messages;

namespace LogisticApi.Services
{
    /// <summary>
    /// The one connection to Claude every AI feature shares: the key from "Anthropic:ApiKey" (or ANTHROPIC_API_KEY), and Claude's
    /// failures turned into ProblemDetails a person can act on.
    /// </summary>
    public class ClaudeClient(IConfiguration configuration, ILogger<ClaudeClient> logger)
    {
        private AnthropicClient? client;

        /// <summary>Sends one request and returns the answer's text; failure is the title shown when it fails, e.g. "The document couldn't be reviewed.".</summary>
        public async Task<(string text, long inputTokens, long outputTokens)> SendAsync(MessageCreateParams request, string failure, CancellationToken ct)
        {
            Message response;
            try
            {
                response = await Client().Messages.Create(request, ct);
            }
            catch (AnthropicRateLimitException)
            {
                throw new ApiProblemException(StatusCodes.Status429TooManyRequests, "Too many AI requests at once.", "Try again in a minute.");
            }
            catch (AnthropicApiException error)
            {
                logger.LogError(error, "Claude rejected a request: {Failure}", failure);
                throw new ApiProblemException(StatusCodes.Status502BadGateway, failure, "The AI service returned an error; it is logged.");
            }
            catch (AnthropicIOException error)
            {
                logger.LogError(error, "Couldn't reach Claude: {Failure}", failure);
                throw new ApiProblemException(StatusCodes.Status502BadGateway, "The AI service can't be reached.", "Check the server's internet connection and try again.");
            }

            if (response.StopReason != "end_turn")
            {
                logger.LogWarning("Claude stopped with {StopReason}: {Failure}", response.StopReason, failure);
                throw new ApiProblemException(StatusCodes.Status502BadGateway, failure,
                    response.StopReason == "refusal" ? "The AI declined to answer." : "The answer was cut short.");
            }

            var text = string.Concat(response.Content.Select(b => b.Value).OfType<TextBlock>().Select(t => t.Text));
            if (string.IsNullOrWhiteSpace(text))
                throw new ApiProblemException(StatusCodes.Status502BadGateway, failure, "The AI's answer was empty.");
            return (text, response.Usage.InputTokens, response.Usage.OutputTokens);
        }

        /// <summary>low, medium or high from appsettings; anything else is medium.</summary>
        public static Effort EffortOf(string effort) => effort.ToLowerInvariant() switch
        {
            "low" => Effort.Low,
            "high" => Effort.High,
            _ => Effort.Medium,
        };

        private AnthropicClient Client()
        {
            if (client is not null) return client;
            var apiKey = configuration["Anthropic:ApiKey"] ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new ApiProblemException(StatusCodes.Status503ServiceUnavailable, "The AI isn't set up.",
                    "Add an Anthropic API key as Anthropic:ApiKey in src/LogisticApi/appsettings.Development.local.json (ignored by git).");
            return client = new AnthropicClient { ApiKey = apiKey };
        }
    }
}
