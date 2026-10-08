using LogisticApi.Services;
using LogisticApi.Context;
using Microsoft.EntityFrameworkCore;
using ModuleLeague.Core.Abstractions;
using ModuleLeague.Core.Interceptors;

var builder = WebApplication.CreateBuilder(args);

// Connection string: same key in every environment, value differs per appsettings file
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

// Current user + audit interceptor (fills ds_ fields on save)
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<MLAuditFieldsInterceptor>();

// Database
builder.Services.AddDbContext<ContextDb>((sp, options) =>
    options.UseSqlServer(connectionString,
                sql => sql.MigrationsHistoryTable("__ef_migrations_lg"))
           .AddInterceptors(sp.GetRequiredService<MLAuditFieldsInterceptor>()));

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Module League - Logistic API", Version = "v1" });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Logistic API v1");
    });
}

app.UseHttpsRedirection();
app.UseAuthorization();

app.MapControllers();

app.Run();