import { useCallback, useMemo } from "react";
import { findMember, parseMemberIds, toMemberValue } from "@/lib/memberHelper";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { MemberChip } from "./MemberChip";
import { UserAvatar } from "./UserAvatar";
import type { RecordMemberInputProps } from "./RecordMemberInput.types";

export function RecordMemberInput({
  id,
  field,
  value,
  members,
  disabled,
  placeholder,
  className,
  style,
  onChange,
  onBlur,
}: RecordMemberInputProps) {
  const anchor = useComboboxAnchor();
  const multiple = !!field?.memberSettings?.multiple;
  const selectedIds = useMemo(() => parseMemberIds(value), [value]);
  const memberIds = useMemo(
    () => members?.map((member) => member?.id) ?? [],
    [members],
  );

  const searchText = useCallback(
    (memberId: string) => {
      const member = findMember(members, memberId);
      return `${member?.displayName ?? ""} ${member?.email ?? ""}`;
    },
    [members],
  );
  const change = useCallback(
    (ids: string[]) => onChange?.(toMemberValue(field, ids)),
    [field, onChange],
  );
  const changeOpen = useCallback(
    (open: boolean) => {
      if (!open) onBlur?.();
    },
    [onBlur],
  );

  return (
    <div className={className} style={style}>
      <Combobox
        multiple={multiple}
        autoHighlight
        items={memberIds}
        value={selectedIds}
        onValueChange={change}
        itemToStringLabel={searchText}
        disabled={disabled}
        onOpenChange={changeOpen}
      >
        <ComboboxChips ref={anchor} className="w-full">
          <ComboboxValue>
            {(ids) => (
              <>
                {ids.map((memberId) => (
                  <ComboboxChip
                    key={memberId}
                    value={memberId}
                    className="h-auto gap-0 rounded-full p-0"
                  >
                    <MemberChip
                      member={findMember(members, memberId)}
                      className="bg-transparent"
                    />
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  placeholder={
                    placeholder ??
                    (multiple ? "Choose people" : "Choose a person")
                  }
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No one found.</ComboboxEmpty>
          <ComboboxList>
            {(memberId) => {
              const member = findMember(members, memberId);
              return (
                <ComboboxItem key={memberId} value={memberId}>
                  <MemberChip member={member} className="bg-transparent" />
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
