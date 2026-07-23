export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STUDENT = 'STUDENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
}

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
}

export enum UtilityBillStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PENDING = 'PENDING',
  PAID = 'PAID',
}

export enum SupportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
}

export enum RoomChangeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TargetRole {
  ALL = 'ALL',
  MANAGER = 'MANAGER',
  STUDENT = 'STUDENT',
}
