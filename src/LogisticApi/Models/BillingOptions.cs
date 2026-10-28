namespace LogisticApi.Models
{
    /// <summary>The "Billing" appsettings section (v1): who issues invoices, tax, rate cards and charge types.</summary>
    public class BillingOptions
    {
        public const string SectionName = "Billing";

        /// <summary>The sidebar of bill-to companies.</summary>
        public string PartySidebarId { get; set; } = "shipment-party";
        public string Currency { get; set; } = "MYR";
        /// <summary>Shown before amounts, e.g. RM.</summary>
        public string CurrencySymbol { get; set; } = "RM";
        /// <summary>Applied to taxable lines. Confirm the rate with an accountant before going live.</summary>
        public decimal TaxPercent { get; set; }
        public bool FreightTaxable { get; set; } = true;
        /// <summary>Used when the bill-to party has none.</summary>
        public int DefaultCreditTermsDays { get; set; } = 30;
        public BillingIssuer Issuer { get; set; } = new();
        /// <summary>Who an Incoterm suggests pays, consignee or shipper, by its code.</summary>
        public Dictionary<string, string> PayerByIncoterm { get; set; } = [];
        public List<RateCard> RateCards { get; set; } = [];
        public List<ChargeType> ChargeTypes { get; set; } = [];
    }

    /// <summary>The company on the invoice's letterhead.</summary>
    public class BillingIssuer
    {
        public string Name { get; set; } = string.Empty;
        public string RegistrationNo { get; set; } = string.Empty;
        public string TaxId { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
    }

    /// <summary>The freight price for a mode between two zones (Location Zone IDs); "*" matches any zone.</summary>
    public class RateCard
    {
        public string Name { get; set; } = string.Empty;
        public string Mode { get; set; } = string.Empty;
        public string FromZone { get; set; } = "*";
        public string ToZone { get; set; } = "*";
        public decimal RatePerKg { get; set; }
        public decimal MinCharge { get; set; }
        /// <summary>The fuel surcharge, in percent of freight.</summary>
        public decimal FuelPct { get; set; }
        public string Currency { get; set; } = "MYR";
        public DateOnly? ValidFrom { get; set; }
        public DateOnly? ValidTo { get; set; }

        /// <summary>2 for an exact zone pair, 1 with one "*", 0 with both.</summary>
        public int Specificity => (FromZone == "*" ? 0 : 1) + (ToZone == "*" ? 0 : 1);
    }

    /// <summary>
    /// A charge besides freight. Automatic ones go on every invoice; one with FromRule is suggested by a resolved exception of
    /// that rule whose reason is one of FromReasons (any reason but False alarm when empty).
    /// </summary>
    public class ChargeType
    {
        public const string Flat = "flat";
        public const string PerKg = "per_kg";
        public const string PercentOfFreight = "percent_of_freight";
        public const string PerHour = "per_hour";

        public string Key { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        /// <summary>flat, per_kg, percent_of_freight (the rate card's FuelPct) or per_hour.</summary>
        public string Basis { get; set; } = Flat;
        /// <summary>Shown as the line's basis for a flat charge, e.g. "Per document set".</summary>
        public string? BasisText { get; set; }
        public decimal DefaultAmount { get; set; }
        public bool Taxable { get; set; } = true;
        public bool Automatic { get; set; }
        public string? FromRule { get; set; }
        public List<string> FromReasons { get; set; } = [];
    }
}
