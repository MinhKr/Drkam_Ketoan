/**
 * Kiểu dữ liệu của các bảng trong Supabase.
 * Giữ khớp với supabase/migrations/0001_init.sql — sửa SQL thì sửa cả đây.
 */

export type TrangThaiHoSo =
  | 'Nháp'
  | 'Chờ trưởng bộ phận'
  | 'Chờ kế toán viên'
  | 'Chờ kế toán tổng hợp'
  | 'Chờ kế toán trưởng'
  | 'Chờ giám đốc'
  | 'Chờ chi'
  | 'Hoàn thành'
  | 'Trả về'
  | 'Đã hủy';

export type HanhDongNhatKy =
  | 'Nộp hồ sơ'
  | 'Duyệt'
  | 'Trả về'
  | 'Sửa và nộp lại'
  | 'Chi tiền'
  | 'Hủy hồ sơ';

export type Department = {
  id: string;
  code: string;
  name: string;
  /** Tên trưởng bộ phận in sẵn ở ô ký trên phiếu ĐNTT. Không liên quan tới phân quyền. */
  head_name: string | null;
  requires_head_approval: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type Staff = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department_id: string;
  active: boolean;
  created_at: string;
};

export type Profile = {
  id: string;
  staff_id: string | null;
  full_name: string;
  email: string;
  roles: string[];
  department_id: string | null;
  /** Chức danh thật của công ty (VD "Kế toán đối soát"). Chỉ hiển thị, không quyết định quyền. */
  job_title: string | null;
  on_leave: boolean;
  status: 'Hoạt động' | 'Đã khóa';
  created_at: string;
};

export type AccountantAssignment = {
  id: string;
  department_id: string;
  accountant_id: string;
  backup_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Supplier = {
  id: string;
  name: string;
  tax_code: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
};

export type BankAccount = {
  id: string;
  supplier_id: string | null;
  account_number: string;
  bank_name: string;
  account_holder: string;
  is_company_account: boolean;
  active: boolean;
  created_at: string;
};

export type ExpenseType = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
};

export type PaymentRequest = {
  id: string;
  code: string;
  lookup_token: string;
  department_id: string;
  /** Chỉ có ở hồ sơ nộp theo cách cũ. Hồ sơ mới để trống — xem requester_name. */
  requester_id: string | null;
  /** Tên người đề nghị, do chính họ gõ lúc nộp. Tên này in lên phiếu ĐNTT. */
  requester_name: string;
  request_date: string;
  due_date: string | null;
  payment_method: 'Chuyển khoản' | 'Tiền mặt';
  total_amount: number;
  supplier_id: string | null;
  beneficiary_name: string | null;
  tax_code: string | null;
  contact_phone: string | null;
  recipient_account: string | null;
  recipient_bank: string | null;
  recipient_holder: string | null;
  company_account_id: string | null;
  note: string | null;
  status: TrangThaiHoSo;
  holder_id: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  last_return_reason: string | null;
  return_count: number;
  created_at: string;
  updated_at: string;
};

export type RequestLine = {
  id: string;
  request_id: string;
  line_no: number;
  expense_type: string | null;
  description: string;
  amount: number;
};

export type Attachment = {
  id: string;
  request_id: string;
  kind: 'Chứng từ' | 'Ủy nhiệm chi' | 'Phiếu chi';
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  uploaded_by_name: string;
  created_at: string;
};

export type RequestEvent = {
  id: string;
  request_id: string;
  action: HanhDongNhatKy;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string | null;
  note: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  request_id: string;
  unc_number: string | null;
  paid_at: string;
  from_account: string | null;
  amount_paid: number;
  performed_by: string | null;
  created_at: string;
};

export type RequestCounter = {
  department_id: string;
  last_no: number;
};

export type Setting = {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
};

/** Cột nào được phép bỏ trống khi chèn. */
type Ghi<T, BoQua extends keyof T> = Omit<T, BoQua> & Partial<Pick<T, BoQua>>;

/**
 * Khóa ngoại. supabase-js dùng phần này để hiểu các câu select lồng nhau
 * kiểu `select('code, departments(name)')` — thiếu nó thì TypeScript báo lỗi.
 */
type KhoaNgoai<Bang extends string, Cot extends string, Toi extends string, MotMot extends boolean = false> = {
  foreignKeyName: `${Bang}_${Cot}_fkey`;
  columns: [Cot];
  isOneToOne: MotMot;
  referencedRelation: Toi;
  referencedColumns: ['id'];
};

export type Database = {
  public: {
    Tables: {
      departments: {
        Row: Department;
        Insert: Ghi<
          Department,
          'id' | 'created_at' | 'requires_head_approval' | 'active' | 'sort_order' | 'head_name'
        >;
        Update: Partial<Department>;
        Relationships: [];
      };
      staff: {
        Row: Staff;
        Insert: Ghi<Staff, 'id' | 'created_at' | 'active' | 'email' | 'phone'>;
        Update: Partial<Staff>;
        Relationships: [KhoaNgoai<'staff', 'department_id', 'departments'>];
      };
      profiles: {
        Row: Profile;
        Insert: Ghi<
          Profile,
          | 'created_at'
          | 'on_leave'
          | 'status'
          | 'staff_id'
          | 'department_id'
          | 'roles'
          | 'job_title'
        >;
        Update: Partial<Profile>;
        Relationships: [
          KhoaNgoai<'profiles', 'staff_id', 'staff', true>,
          KhoaNgoai<'profiles', 'department_id', 'departments'>,
        ];
      };
      accountant_assignments: {
        Row: AccountantAssignment;
        Insert: Ghi<AccountantAssignment, 'id' | 'created_at' | 'updated_at' | 'backup_id'>;
        Update: Partial<AccountantAssignment>;
        Relationships: [
          KhoaNgoai<'accountant_assignments', 'department_id', 'departments', true>,
          KhoaNgoai<'accountant_assignments', 'accountant_id', 'profiles'>,
          KhoaNgoai<'accountant_assignments', 'backup_id', 'profiles'>,
        ];
      };
      suppliers: {
        Row: Supplier;
        Insert: Ghi<Supplier, 'id' | 'created_at' | 'active' | 'tax_code' | 'phone'>;
        Update: Partial<Supplier>;
        Relationships: [];
      };
      bank_accounts: {
        Row: BankAccount;
        Insert: Ghi<
          BankAccount,
          'id' | 'created_at' | 'active' | 'is_company_account' | 'supplier_id'
        >;
        Update: Partial<BankAccount>;
        Relationships: [KhoaNgoai<'bank_accounts', 'supplier_id', 'suppliers'>];
      };
      expense_types: {
        Row: ExpenseType;
        Insert: Ghi<ExpenseType, 'id' | 'active' | 'sort_order'>;
        Update: Partial<ExpenseType>;
        Relationships: [];
      };
      payment_requests: {
        Row: PaymentRequest;
        Insert: Ghi<
          PaymentRequest,
          | 'id'
          | 'requester_id'
          | 'created_at'
          | 'updated_at'
          | 'request_date'
          | 'payment_method'
          | 'total_amount'
          | 'status'
          | 'return_count'
          | 'due_date'
          | 'supplier_id'
          | 'beneficiary_name'
          | 'tax_code'
          | 'contact_phone'
          | 'recipient_account'
          | 'recipient_bank'
          | 'recipient_holder'
          | 'company_account_id'
          | 'note'
          | 'holder_id'
          | 'submitted_at'
          | 'completed_at'
          | 'last_return_reason'
        >;
        Update: Partial<PaymentRequest>;
        Relationships: [
          KhoaNgoai<'payment_requests', 'department_id', 'departments'>,
          KhoaNgoai<'payment_requests', 'requester_id', 'staff'>,
          KhoaNgoai<'payment_requests', 'supplier_id', 'suppliers'>,
          KhoaNgoai<'payment_requests', 'company_account_id', 'bank_accounts'>,
          KhoaNgoai<'payment_requests', 'holder_id', 'profiles'>,
        ];
      };
      request_lines: {
        Row: RequestLine;
        Insert: Ghi<RequestLine, 'id' | 'line_no' | 'amount' | 'expense_type'>;
        Update: Partial<RequestLine>;
        Relationships: [KhoaNgoai<'request_lines', 'request_id', 'payment_requests'>];
      };
      attachments: {
        Row: Attachment;
        Insert: Ghi<
          Attachment,
          | 'id'
          | 'created_at'
          | 'kind'
          | 'mime_type'
          | 'size_bytes'
          | 'uploaded_by'
          | 'uploaded_by_name'
        >;
        Update: Partial<Attachment>;
        Relationships: [
          KhoaNgoai<'attachments', 'request_id', 'payment_requests'>,
          KhoaNgoai<'attachments', 'uploaded_by', 'profiles'>,
        ];
      };
      request_events: {
        Row: RequestEvent;
        Insert: Ghi<
          RequestEvent,
          'id' | 'created_at' | 'from_status' | 'actor_id' | 'actor_role' | 'note'
        >;
        /** Nhật ký chỉ được thêm — không có đường sửa, kể cả từ mã nguồn. */
        Update: Record<string, never>;
        Relationships: [
          KhoaNgoai<'request_events', 'request_id', 'payment_requests'>,
          KhoaNgoai<'request_events', 'actor_id', 'profiles'>,
        ];
      };
      payments: {
        Row: Payment;
        Insert: Ghi<
          Payment,
          | 'id'
          | 'created_at'
          | 'paid_at'
          | 'amount_paid'
          | 'unc_number'
          | 'from_account'
          | 'performed_by'
        >;
        Update: Partial<Payment>;
        Relationships: [
          KhoaNgoai<'payments', 'request_id', 'payment_requests', true>,
          KhoaNgoai<'payments', 'performed_by', 'profiles'>,
        ];
      };
      request_counters: {
        Row: RequestCounter;
        Insert: Ghi<RequestCounter, 'last_no'>;
        Update: Partial<RequestCounter>;
        Relationships: [
          KhoaNgoai<'request_counters', 'department_id', 'departments', true>,
        ];
      };
      settings: {
        Row: Setting;
        Insert: Ghi<Setting, 'updated_at' | 'description'>;
        Update: Partial<Setting>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      my_roles: { Args: Record<string, never>; Returns: string[] };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_active_user: { Args: Record<string, never>; Returns: boolean };
      next_request_code: { Args: { p_department_id: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
