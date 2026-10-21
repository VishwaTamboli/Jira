import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Start from a clean slate so the seed is repeatable.
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('demo123', 10);

  const admin = await prisma.user.create({
    data: { name: 'Alice Admin', email: 'admin@demo.com', password, role: 'admin' },
  });
  const manager = await prisma.user.create({
    data: { name: 'Bob Manager', email: 'manager@demo.com', password, role: 'manager' },
  });
  const emp1 = await prisma.user.create({
    data: { name: 'Carol Employee', email: 'employee@demo.com', password, role: 'employee' },
  });
  const emp2 = await prisma.user.create({
    data: { name: 'Dan Employee', email: 'employee2@demo.com', password, role: 'employee' },
  });

  const website = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Refresh the marketing website with a new look and improved performance.',
      createdBy: manager.id,
    },
  });
  const mobile = await prisma.project.create({
    data: {
      name: 'Mobile App',
      description: 'First release of the mobile companion app.',
      createdBy: admin.id,
    },
  });

  const inAWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const tasks = [
    {
      title: 'Design new landing page',
      description: 'Create wireframes and a high fidelity design for the landing page.',
      status: 'todo',
      priority: 'high',
      labels: 'design, marketing',
      projectId: website.id,
      assignedTo: emp1.id,
      createdBy: manager.id,
      dueDate: inAWeek,
    },
    {
      title: 'Set up CI pipeline',
      description: 'Add GitHub Actions workflow for lint, typecheck and tests.',
      status: 'todo',
      priority: 'medium',
      labels: 'devops',
      projectId: website.id,
      assignedTo: emp2.id,
      createdBy: manager.id,
    },
    {
      title: 'Write copy for pricing page',
      description: 'Draft the pricing tiers and FAQ copy.',
      status: 'todo',
      priority: 'low',
      labels: 'content',
      projectId: website.id,
      assignedTo: null,
      createdBy: manager.id,
    },
    {
      title: 'Implement responsive navigation',
      description: 'Build the top navigation with mobile menu support.',
      status: 'in_progress',
      priority: 'high',
      labels: 'frontend',
      projectId: website.id,
      assignedTo: emp1.id,
      createdBy: manager.id,
      dueDate: inThreeDays,
    },
    {
      title: 'Optimize images',
      description: 'Convert images to modern formats and add lazy loading.',
      status: 'in_progress',
      priority: 'medium',
      labels: 'performance',
      projectId: website.id,
      assignedTo: emp2.id,
      createdBy: admin.id,
    },
    {
      title: 'Setup analytics',
      description: 'Add page view tracking and goal events.',
      status: 'done',
      priority: 'medium',
      labels: 'analytics',
      projectId: website.id,
      assignedTo: emp1.id,
      createdBy: manager.id,
    },
    {
      title: 'Define onboarding flow',
      description: 'Sketch the first-run experience for new users.',
      status: 'todo',
      priority: 'high',
      labels: 'product, ux',
      projectId: mobile.id,
      assignedTo: emp2.id,
      createdBy: admin.id,
      dueDate: inAWeek,
    },
    {
      title: 'Build login screen',
      description: 'Email/password login screen with validation.',
      status: 'in_progress',
      priority: 'high',
      labels: 'frontend',
      projectId: mobile.id,
      assignedTo: emp1.id,
      createdBy: admin.id,
    },
    {
      title: 'Choose app icon',
      description: 'Finalise the app icon across all densities.',
      status: 'done',
      priority: 'low',
      labels: 'design',
      projectId: mobile.id,
      assignedTo: emp2.id,
      createdBy: admin.id,
    },
  ];

  for (const t of tasks) {
    await prisma.task.create({ data: t });
  }

  // A couple of demo notifications for the employee account.
  await prisma.notification.createMany({
    data: [
      { userId: emp1.id, message: 'You were assigned to "Design new landing page"', read: false },
      { userId: emp1.id, message: 'You were assigned to "Implement responsive navigation"', read: false },
      { userId: emp2.id, message: 'You were assigned to "Set up CI pipeline"', read: true },
    ],
  });

  console.log('Seed complete.');
  console.log('Demo accounts (password: demo123):');
  console.log('  admin@demo.com     (admin)');
  console.log('  manager@demo.com   (manager)');
  console.log('  employee@demo.com  (employee)');
  console.log('  employee2@demo.com (employee)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
