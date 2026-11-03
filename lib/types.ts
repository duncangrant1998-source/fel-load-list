export type Role = "staff" | "manager";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_admin: boolean;
  created_at: string;
}

export type LoadListStatus = "active" | "departed" | "returned" | "archived";

export interface LoadList {
  id: string;
  program: string;
  contact_name: string;
  location: string;
  mode: string;
  depart_date: string | null;
  return_date: string | null;
  status: LoadListStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LoadListItem {
  id: string;
  load_list_id: string;
  category: string;
  name: string;
  quantity: string;
  notes: string;
  packed: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemComment {
  id: string;
  item_id: string;
  load_list_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  recipient_id: string;
  load_list_id: string;
  item_id: string;
  comment_id: string;
  actor_id: string;
  program: string;
  item_name: string;
  snippet: string;
  created_at: string;
  read_at: string | null;
}

export interface LoadListMember {
  load_list_id: string;
  user_id: string;
  added_by: string | null;
  created_at: string;
}

// Fixed options shown in the mode picker. "Other" reveals a free-text field
// so a one-off method of transportation can be typed in instead.
export const TRANSPORT_MODES = [
  "White F150",
  "Blue F150",
  "E450",
  "FEL Motorsports Hauler",
  "Other",
];

export const STATUS_LABEL: Record<LoadListStatus, string> = {
  active: "Active",
  departed: "Departed",
  returned: "Returned",
  archived: "Archived",
};
