const fs = require('fs');
let code = fs.readFileSync('backend/prisma/schema.prisma', 'utf8');

const newModel = `
model AttendanceLog {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  user_id         String    @db.Uuid
  project_id      String?   @db.Uuid
  check_in_time   DateTime  @default(now()) @db.Timestamptz
  check_out_time  DateTime? @db.Timestamptz
  check_in_image  String?
  check_out_image String?
  notes           String?
  created_at      DateTime  @default(now()) @db.Timestamptz
  updated_at      DateTime  @default(now()) @db.Timestamptz

  user    User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [project_id], references: [id], onDelete: SetNull)

  @@index([user_id])
  @@index([project_id])
  @@index([check_in_time])
  @@map("attendance_logs")
}
`;

if (!code.includes('model AttendanceLog')) {
  code += newModel;
}

if (!code.includes('attendance_logs AttendanceLog[]')) {
  code = code.replace(
    'inventory_transactions InventoryTransaction[] @relation("TransactionCreatedBy")',
    'inventory_transactions InventoryTransaction[] @relation("TransactionCreatedBy")\n  attendance_logs AttendanceLog[]'
  );
}

fs.writeFileSync('backend/prisma/schema.prisma', code);
console.log("Updated schema.prisma");
