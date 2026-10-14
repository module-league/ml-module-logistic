namespace LogisticApi.MVVM
{
    public class SidebarRecordCreateRequest 
    {
        public Dictionary<Guid, string?> values { get; set; } = [];
    }

    public class SidebarRecordUpdateRequest
    {
        public Dictionary<Guid, string?> values { get; set; } = [];
        public int versionNo { get; set; }
    }

    public class SidebarRecordValue
    {
        public Guid fieldId { get; set; }
        public string type { get; set; } = string.Empty;
        public string? value { get; set; }
    }

    public class SidebarRecordResponse
    {
        public Guid objId { get; set; }
        public int docId { get; set; }
        public string sidebarId { get; set; } = string.Empty;
        public Dictionary<Guid, string?> values { get; set; } = [];
        public int versionNo { get; set; }
        public DateTime createTime { get; set; }
    }

}
