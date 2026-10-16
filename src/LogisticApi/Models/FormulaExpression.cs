using System.Text.RegularExpressions;
using LogisticApi.Services;

namespace LogisticApi.Models
{
    /// <summary>
    /// A formula field's expression: math.js syntax, worked out by the web app, with each field written {fieldObjId}.
    /// The API only checks that every reference is a field id.
    /// </summary>
    public static partial class FormulaExpression
    {
        /// <summary>The fields the expression reads, in order without repeats; throws BadRequest when a reference isn't a field id.</summary>
        public static List<Guid> FieldIdsOf(string expression)
        {
            var ids = new List<Guid>();
            foreach (Match match in Reference().Matches(expression))
            {
                if (!Guid.TryParse(match.Groups[1].Value, out var id))
                    throw ApiProblemException.BadRequest("The formula can't be worked out.", $"'{{{match.Groups[1].Value}}}' isn't a field.");
                if (!ids.Contains(id)) ids.Add(id);
            }
            if (Reference().Replace(expression, "").IndexOfAny(['{', '}']) >= 0)
                throw ApiProblemException.BadRequest("The formula can't be worked out.", "A field reference isn't complete.");
            return ids;
        }

        [GeneratedRegex(@"\{([^{}]*)\}")]
        private static partial Regex Reference();
    }
}
