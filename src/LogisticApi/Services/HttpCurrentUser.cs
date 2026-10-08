using ModuleLeague.Core.Abstractions;

namespace LogisticApi.Services
{
    /// <summary>
    /// Reads the current user's id from the Keycloak "sub" claim.
    /// Used by MLAuditFieldsInterceptor to fill ds_created_by / ds_updated_by / ds_deleted_by.
    /// </summary>
    public class HttpCurrentUser : ICurrentUser
    {
        private readonly IHttpContextAccessor _accessor;

        public HttpCurrentUser(IHttpContextAccessor accessor)
        {
            _accessor = accessor;
        }

        // Returns Guid.Empty until Keycloak is wired up
        public Guid UserId =>
            Guid.TryParse(_accessor.HttpContext?.User.FindFirst("sub")?.Value, out var id)
                ? id
                : Guid.Empty;
    }
}