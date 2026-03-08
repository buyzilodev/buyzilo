/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const prisma = new PrismaClient()
  
  const newPassword = 'Admin123!'
  const hashed = await bcrypt.hash(newPassword, 12)
  
  const updated = await prisma.user.update({
    where: { email: 'Tayyeb.khan94@gmail.com' },
    data: { password: hashed }
  })
  
  console.log('✅ Password reset for:', updated.email)
  console.log('📧 Email:', updated.email)
  console.log('🔑 New Password: Admin123!')
  
  await prisma.$disconnect()
}

main().catch(console.error)
