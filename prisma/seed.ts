import { PrismaClient, Role, InterestMethod, LoanType, Gender } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding initial data...')

  // 1. Head Office Branch
  let headOffice = await prisma.branch.findFirst({
    where: { name: 'Head Office' },
  })

  if (!headOffice) {
    headOffice = await prisma.branch.create({
      data: {
        name: 'Head Office',
        address: '124 Galle Road, Colombo 03, Sri Lanka',
        phone: '+94 11 234 5678',
        isActive: true,
      },
    })
    console.log(`Created Head Office branch (ID: ${headOffice.id})`)
  }

  // 2. Initial Admin User
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@superaplus.lk'
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.userProfile.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
      role: Role.ADMIN,
      branchId: headOffice.id,
    },
    create: {
      email: adminEmail,
      fullName: 'Super Administrator',
      passwordHash,
      role: Role.ADMIN,
      branchId: headOffice.id,
      isActive: true,
    },
  })
  console.log(`Admin user: ${admin.email}`)

  // 3. Seed Micro Centres
  const centresData = [
    { name: 'Mahaweli Centre A', branchId: headOffice.id },
    { name: 'Kiribathgoda C', branchId: headOffice.id },
    { name: 'Kadawatha B', branchId: headOffice.id },
  ]

  const centres: Record<string, string> = {}
  for (const c of centresData) {
    let centre = await prisma.centre.findFirst({
      where: { name: c.name, branchId: c.branchId },
    })
    if (!centre) {
      centre = await prisma.centre.create({ data: c })
    }
    centres[c.name] = centre.id
  }
  console.log(`Seeded ${Object.keys(centres).length} centres.`)

  // 4. Seed Standard Loan Products
  const productsData = [
    {
      name: 'Weekly Micro Business (Flat)',
      loanType: LoanType.BUSINESS,
      interestMethod: InterestMethod.FLAT,
      annualInterestRate: 0.24, // 24%
      minAmount: 25000,
      maxAmount: 300000,
      minTermWeeks: 26,
      maxTermWeeks: 52,
      processingFeeRate: 0.015,
      requiresGuarantor: true,
    },
    {
      name: 'SME Growth Loan (Reducing)',
      loanType: LoanType.BUSINESS,
      interestMethod: InterestMethod.REDUCING_BALANCE,
      annualInterestRate: 0.18, // 18%
      minAmount: 100000,
      maxAmount: 1000000,
      minTermWeeks: 26,
      maxTermWeeks: 104,
      processingFeeRate: 0.02,
      requiresGuarantor: true,
    },
  ]

  for (const p of productsData) {
    const existing = await prisma.loanProduct.findUnique({
      where: { name: p.name },
    })
    if (!existing) {
      await prisma.loanProduct.create({ data: p })
    }
  }
  console.log('Seeded loan products.')

  // 5. Seed Sample Members
  const sampleMembers = [
    {
      memberNumber: 'M-0001',
      fullName: 'Kamal Perera',
      nic: '851234567V',
      gender: Gender.MALE,
      phone: '+94 77 123 4567',
      address: 'No 45, Temple Road, Kiribathgoda',
      centreId: centres['Kiribathgoda C'],
      dateOfBirth: new Date('1985-05-12'),
    },
    {
      memberNumber: 'M-0002',
      fullName: 'Nimali Silva',
      nic: '906541234V',
      gender: Gender.FEMALE,
      phone: '+94 71 987 6543',
      address: 'No 12/A, Station Road, Kadawatha',
      centreId: centres['Kadawatha B'],
      dateOfBirth: new Date('1990-09-24'),
    },
    {
      memberNumber: 'M-0003',
      fullName: 'Sunil Jayasuriya',
      nic: '781234567V',
      gender: Gender.MALE,
      phone: '+94 76 555 4321',
      address: 'No 88, Lake View, Mahaweli Colony',
      centreId: centres['Mahaweli Centre A'],
      dateOfBirth: new Date('1978-02-18'),
    },
    {
      memberNumber: 'M-0004',
      fullName: 'Anusha Fernando',
      nic: '199256781234',
      gender: Gender.FEMALE,
      phone: '+94 70 333 8899',
      address: 'No 105, Main Street, Kiribathgoda',
      centreId: centres['Kiribathgoda C'],
      dateOfBirth: new Date('1992-07-15'),
    },
  ]

  for (const m of sampleMembers) {
    const existing = await prisma.member.findUnique({ where: { nic: m.nic } })
    if (!existing) {
      await prisma.member.create({ data: m })
    }
  }
  console.log('Seeded sample members.')
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
