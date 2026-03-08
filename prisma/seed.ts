import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 12)

  await prisma.user.upsert({
    where: { email: 'admin@buyzilo.com' },
    update: {},
    create: {
      email: 'admin@buyzilo.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@buyzilo.com' },
    update: {},
    create: {
      email: 'vendor@buyzilo.com',
      name: 'Tech Vendor',
      password: hashedPassword,
      role: 'VENDOR',
    },
  })

  await prisma.user.upsert({
    where: { email: 'buyer@buyzilo.com' },
    update: {},
    create: {
      email: 'buyer@buyzilo.com',
      name: 'Test Buyer',
      password: hashedPassword,
      role: 'BUYER',
    },
  })

  const store = await prisma.store.upsert({
    where: { vendorId: vendorUser.id },
    update: {},
    create: {
      vendorId: vendorUser.id,
      name: 'TechStore',
      slug: 'techstore',
      description: 'Electronics and gadgets',
      status: 'APPROVED',
    },
  })

  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'electronics' }, update: {}, create: { name: 'Electronics', slug: 'electronics', image: '💻' } }),
    prisma.category.upsert({ where: { slug: 'fashion' }, update: {}, create: { name: 'Fashion', slug: 'fashion', image: '👗' } }),
    prisma.category.upsert({ where: { slug: 'sports' }, update: {}, create: { name: 'Sports', slug: 'sports', image: '⚽' } }),
    prisma.category.upsert({ where: { slug: 'home-garden' }, update: {}, create: { name: 'Home & Garden', slug: 'home-garden', image: '🏠' } }),
    prisma.category.upsert({ where: { slug: 'beauty' }, update: {}, create: { name: 'Beauty', slug: 'beauty', image: '💄' } }),
    prisma.category.upsert({ where: { slug: 'books' }, update: {}, create: { name: 'Books', slug: 'books', image: '📚' } }),
  ])

  const electronics = categories[0]
  const fashion = categories[1]
  const sports = categories[2]

  const products = [
    { name: 'Wireless Headphones', slug: 'wireless-headphones', price: 99.99, comparePrice: 149.99, description: 'Premium wireless headphones with noise cancellation.', images: ['🎧'] },
    { name: 'Running Shoes Elite', slug: 'running-shoes-elite', price: 79.99, comparePrice: 119.99, description: 'Lightweight running shoes with advanced cushioning.', images: ['👟'] },
    { name: 'Smart Coffee Maker', slug: 'smart-coffee-maker', price: 49.99, comparePrice: 79.99, description: 'Programmable coffee maker with 12-cup capacity.', images: ['☕'] },
    { name: 'Premium Yoga Mat', slug: 'premium-yoga-mat', price: 29.99, comparePrice: 49.99, description: 'Non-slip yoga mat with alignment lines.', images: ['🧘'] },
    { name: 'UV Sunglasses', slug: 'uv-sunglasses', price: 59.99, comparePrice: 89.99, description: 'UV400 polarized sunglasses.', images: ['🕶️'] },
    { name: 'Travel Backpack', slug: 'travel-backpack', price: 89.99, comparePrice: 129.99, description: 'Water-resistant backpack with laptop compartment.', images: ['🎒'] },
    { name: 'Smart Watch Pro X', slug: 'smart-watch-pro-x', price: 199.99, comparePrice: 299.99, description: 'Smartwatch with health monitoring and GPS.', images: ['⌚'] },
    { name: 'LED Desk Lamp', slug: 'led-desk-lamp', price: 39.99, comparePrice: 59.99, description: 'LED desk lamp with adjustable brightness.', images: ['🪔'] },
  ]

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const category = i < 3 ? electronics : i < 6 ? sports : fashion
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        storeId: store.id,
        categoryId: category.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        comparePrice: p.comparePrice,
        stock: 100,
        images: p.images,
        isActive: true,
        approvalStatus: 'APPROVED',
      },
    })
  }

  await prisma.coupon.upsert({
    where: { code: 'BUYZILO10' },
    update: {},
    create: { code: 'BUYZILO10', discount: 10, isPercent: true, minOrder: 50, isActive: true },
  })
  await prisma.coupon.upsert({
    where: { code: 'SAVE20' },
    update: {},
    create: { code: 'SAVE20', discount: 20, isPercent: true, maxUses: 100, isActive: true },
  })

  console.log('Seed done. Admin: admin@buyzilo.com / admin123')
  console.log('Vendor: vendor@buyzilo.com / admin123')
  console.log('Buyer: buyer@buyzilo.com / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
