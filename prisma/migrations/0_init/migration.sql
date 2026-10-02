-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'front_desk',
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'available',
    "resId" TEXT,
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "preferredName" TEXT,
    "birthday" TEXT,
    "nationality" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "passportNumber" TEXT,
    "passportExpiry" TEXT,
    "language" TEXT,
    "memberNumber" TEXT,
    "vipStatus" TEXT,
    "company" TEXT,
    "city" TEXT,
    "country" TEXT,
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "preferenceNotes" TEXT,
    "specialRequests" TEXT,
    "smokingPref" TEXT,
    "bedPref" TEXT,
    "pillowPref" TEXT,
    "floorPref" TEXT,
    "viewPref" TEXT,
    "temperaturePref" TEXT,
    "allergiesPref" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "parentCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "notes" TEXT,
    "type" TEXT NOT NULL DEFAULT 'COMPANY',
    "contractRates" JSONB NOT NULL DEFAULT '{}',
    "blackoutStart" TEXT,
    "blackoutEnd" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditUsed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "creditResetDay" INTEGER NOT NULL DEFAULT 1,
    "lastCreditReset" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "reservationNumber" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "guestId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "nationality" TEXT,
    "roomId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "checkIn" TEXT NOT NULL,
    "checkOut" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "totalNights" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT,
    "bookingReference" TEXT,
    "vipStatus" TEXT,
    "passportNumber" TEXT,
    "companyId" TEXT,
    "specials" TEXT,
    "eta" TEXT,
    "flightNumber" TEXT,
    "visaDetails" TEXT,
    "turndown" BOOLEAN NOT NULL DEFAULT false,
    "dnm" BOOLEAN NOT NULL DEFAULT false,
    "actualCheckIn" TIMESTAMP(3),
    "actualCheckOut" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "moveReason" TEXT,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "masterResId" TEXT,
    "preferredName" TEXT,
    "birthday" TEXT,
    "passportExpiry" TEXT,
    "language" TEXT,
    "memberNumber" TEXT,
    "city" TEXT,
    "country" TEXT,
    "createdBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Charge" (
    "id" SERIAL NOT NULL,
    "reservationId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folio" (
    "id" SERIAL NOT NULL,
    "reservationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "paymentMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolioCharge" (
    "id" SERIAL NOT NULL,
    "folioId" INTEGER NOT NULL,
    "chargeId" INTEGER NOT NULL,

    CONSTRAINT "FolioCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trace" (
    "id" SERIAL NOT NULL,
    "reservationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "department" TEXT NOT NULL DEFAULT 'FRONT OFFICE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" SERIAL NOT NULL,
    "reservationId" TEXT NOT NULL,
    "pkgId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "licensePlate" TEXT,
    "carModel" TEXT,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" SERIAL NOT NULL,
    "companyId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "reservationId" TEXT,
    "folioId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'company_credit',
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "companyId" TEXT,
    "reservationId" TEXT,
    "billTo" TEXT NOT NULL,
    "billTaxId" TEXT,
    "billAddress" TEXT,
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 7,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issuedAt" TIMESTAMP(3),
    "dueDate" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NightAudit" (
    "id" SERIAL NOT NULL,
    "hotelId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "chargesPosted" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "runBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NightAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HotelSetting" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL DEFAULT 'THB',
    "altCurrency" TEXT NOT NULL DEFAULT 'USD',
    "fxRate" DOUBLE PRECISION NOT NULL DEFAULT 36,
    "fxRates" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "hotelId" TEXT NOT NULL DEFAULT 'HOTEL-001',
    "openedBy" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedBy" TEXT,
    "closedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'open',
    "openingFloat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedCash" DOUBLE PRECISION,
    "countedCash" DOUBLE PRECISION,
    "variance" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preferences" (
    "id" SERIAL NOT NULL,
    "reservationId" TEXT NOT NULL,
    "smoking" TEXT,
    "bed" TEXT,
    "pillow" TEXT,
    "floor" TEXT,
    "view" TEXT,
    "temperature" TEXT,
    "allergies" TEXT,
    "amenities" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_hotelId_idx" ON "User"("hotelId");

-- CreateIndex
CREATE INDEX "Room_hotelId_idx" ON "Room"("hotelId");

-- CreateIndex
CREATE INDEX "Room_hotelId_status_idx" ON "Room"("hotelId", "status");

-- CreateIndex
CREATE INDEX "Guest_hotelId_idx" ON "Guest"("hotelId");

-- CreateIndex
CREATE INDEX "Guest_hotelId_name_idx" ON "Guest"("hotelId", "name");

-- CreateIndex
CREATE INDEX "Guest_hotelId_passportNumber_idx" ON "Guest"("hotelId", "passportNumber");

-- CreateIndex
CREATE INDEX "Guest_hotelId_email_idx" ON "Guest"("hotelId", "email");

-- CreateIndex
CREATE INDEX "Guest_hotelId_phone_idx" ON "Guest"("hotelId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "ChargeCode_code_key" ON "ChargeCode"("code");

-- CreateIndex
CREATE INDEX "ChargeCode_hotelId_idx" ON "ChargeCode"("hotelId");

-- CreateIndex
CREATE INDEX "ChargeCode_hotelId_active_idx" ON "ChargeCode"("hotelId", "active");

-- CreateIndex
CREATE INDEX "Company_hotelId_idx" ON "Company"("hotelId");

-- CreateIndex
CREATE INDEX "Company_hotelId_type_idx" ON "Company"("hotelId", "type");

-- CreateIndex
CREATE INDEX "Company_hotelId_active_idx" ON "Company"("hotelId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_reservationNumber_key" ON "Reservation"("reservationNumber");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_idx" ON "Reservation"("hotelId");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_status_idx" ON "Reservation"("hotelId", "status");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_checkIn_idx" ON "Reservation"("hotelId", "checkIn");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_checkOut_idx" ON "Reservation"("hotelId", "checkOut");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_status_checkIn_idx" ON "Reservation"("hotelId", "status", "checkIn");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_status_checkOut_idx" ON "Reservation"("hotelId", "status", "checkOut");

-- CreateIndex
CREATE INDEX "Reservation_roomId_idx" ON "Reservation"("roomId");

-- CreateIndex
CREATE INDEX "Reservation_guestId_idx" ON "Reservation"("guestId");

-- CreateIndex
CREATE INDEX "Reservation_companyId_idx" ON "Reservation"("companyId");

-- CreateIndex
CREATE INDEX "Reservation_masterResId_idx" ON "Reservation"("masterResId");

-- CreateIndex
CREATE INDEX "Charge_reservationId_idx" ON "Charge"("reservationId");

-- CreateIndex
CREATE INDEX "Charge_date_idx" ON "Charge"("date");

-- CreateIndex
CREATE INDEX "Folio_reservationId_idx" ON "Folio"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "FolioCharge_chargeId_key" ON "FolioCharge"("chargeId");

-- CreateIndex
CREATE INDEX "FolioCharge_folioId_idx" ON "FolioCharge"("folioId");

-- CreateIndex
CREATE INDEX "Trace_reservationId_idx" ON "Trace"("reservationId");

-- CreateIndex
CREATE INDEX "Trace_status_idx" ON "Trace"("status");

-- CreateIndex
CREATE INDEX "Trace_reservationId_status_idx" ON "Trace"("reservationId", "status");

-- CreateIndex
CREATE INDEX "Package_reservationId_idx" ON "Package"("reservationId");

-- CreateIndex
CREATE INDEX "CreditTransaction_companyId_idx" ON "CreditTransaction"("companyId");

-- CreateIndex
CREATE INDEX "CreditTransaction_hotelId_idx" ON "CreditTransaction"("hotelId");

-- CreateIndex
CREATE INDEX "CreditTransaction_reservationId_idx" ON "CreditTransaction"("reservationId");

-- CreateIndex
CREATE INDEX "CreditTransaction_companyId_status_idx" ON "CreditTransaction"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TaxInvoice_invoiceNumber_key" ON "TaxInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "TaxInvoice_hotelId_idx" ON "TaxInvoice"("hotelId");

-- CreateIndex
CREATE INDEX "TaxInvoice_companyId_idx" ON "TaxInvoice"("companyId");

-- CreateIndex
CREATE INDEX "TaxInvoice_hotelId_status_idx" ON "TaxInvoice"("hotelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NightAudit_hotelId_businessDate_key" ON "NightAudit"("hotelId", "businessDate");

-- CreateIndex
CREATE INDEX "Shift_hotelId_status_idx" ON "Shift"("hotelId", "status");

-- CreateIndex
CREATE INDEX "Shift_hotelId_openedAt_idx" ON "Shift"("hotelId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Preferences_reservationId_key" ON "Preferences"("reservationId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_masterResId_fkey" FOREIGN KEY ("masterResId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Charge" ADD CONSTRAINT "Charge_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folio" ADD CONSTRAINT "Folio_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioCharge" ADD CONSTRAINT "FolioCharge_folioId_fkey" FOREIGN KEY ("folioId") REFERENCES "Folio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolioCharge" ADD CONSTRAINT "FolioCharge_chargeId_fkey" FOREIGN KEY ("chargeId") REFERENCES "Charge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trace" ADD CONSTRAINT "Trace_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxInvoice" ADD CONSTRAINT "TaxInvoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preferences" ADD CONSTRAINT "Preferences_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

