import { randomUUID } from 'crypto'
import { constants, type Dirent } from 'fs'
import { copyFile, mkdir, readdir, lstat, chmod, unlink } from 'fs/promises'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const publicDirectory = path.join(process.cwd(), 'public', 'uploads', 'documents')
const privateDirectory = path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(process.cwd(), 'storage', 'documents'))
const extensionMap: Record<string, string> = {
  '.jpg': '.jpg',
  '.jpeg': '.jpg',
  '.png': '.png',
  '.webp': '.webp',
  '.pdf': '.pdf',
}

async function main() {
  const relativeToPublic = path.relative(path.resolve(process.cwd(), 'public'), privateDirectory)
  if (relativeToPublic === '' || (!relativeToPublic.startsWith(`..${path.sep}`) && relativeToPublic !== '..' && !path.isAbsolute(relativeToPublic))) {
    throw new Error('DOCUMENT_STORAGE_DIR must be outside the public directory')
  }

  const legacyDocuments = await prisma.document.findMany({
    where: { storagePath: { startsWith: '/uploads/documents/' } },
    select: { id: true, storagePath: true },
  })

  let entries: Dirent[] = []
  try {
    entries = await readdir(publicDirectory, { withFileTypes: true })
  } catch (error) {
    if (!(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT')) throw error
  }

  const files = new Map<string, string>()
  for (const entry of entries) {
    if (!entry.isFile()) throw new Error('Legacy document directory contains a non-file entry; inspect it manually')
    const extension = extensionMap[path.extname(entry.name).toLowerCase()] || '.bin'
    files.set(entry.name, `${randomUUID()}${extension}`)
  }

  for (const document of legacyDocuments) {
    const name = document.storagePath.slice('/uploads/documents/'.length)
    if (!name || path.basename(name) !== name || !files.has(name)) {
      throw new Error('A database document references a missing or unsafe legacy file; no changes were made')
    }
  }

  console.log(`Found ${legacyDocuments.length} legacy database records and ${files.size} public files.`)
  if (!apply) {
    console.log('Dry run only. Re-run with --apply to copy files, update records, and remove public copies.')
    return
  }

  await mkdir(privateDirectory, { recursive: true, mode: 0o700 })
  const copied: string[] = []
  try {
    for (const [oldName, newName] of files) {
      const source = path.join(publicDirectory, oldName)
      const destination = path.join(privateDirectory, newName)
      const sourceInfo = await lstat(source)
      if (!sourceInfo.isFile() || sourceInfo.isSymbolicLink()) throw new Error('Legacy document changed during migration')
      await copyFile(source, destination, constants.COPYFILE_EXCL)
      await chmod(destination, 0o600)
      copied.push(destination)
    }

    await prisma.$transaction(async (tx) => {
      for (const document of legacyDocuments) {
        const oldName = document.storagePath.slice('/uploads/documents/'.length)
        await tx.document.update({
          where: { id: document.id },
          data: { storagePath: files.get(oldName)! },
        })
      }
    })
  } catch (error) {
    await Promise.all(copied.map((file) => unlink(file).catch(() => undefined)))
    throw error
  }

  for (const name of files.keys()) await unlink(path.join(publicDirectory, name))
  console.log('Migration complete. Public document copies were removed.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Document migration failed')
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
