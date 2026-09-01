const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askPassword() {
  return new Promise((resolve) => {
    rl.question('🔑 أدخل كلمة مرور قاعدة البيانات (Database Password): ', (password) => {
      rl.close()
      resolve(password)
    })
  })
}

async function main() {
  const password = await askPassword()
  
  const client = new Client({
    connectionString: `postgresql://postgres:${password}@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('🔌 جاري الاتصال بقاعدة البيانات...')
    await client.connect()
    console.log('✅ تم الاتصال بنجاح!')

    const sqlFile = path.join(__dirname, 'supabase', 'setup.sql')
    const sql = fs.readFileSync(sqlFile, 'utf8')

    console.log('📦 جاري تشغيل SQL...')
    console.log(`   (${sql.split('\n').length} سطر)`)
    
    await client.query(sql)
    
    console.log('🎉 تم بناء قاعدة البيانات بنجاح!')
    console.log('')
    console.log('الآن شغّل: npm run dev')
  } catch (error) {
    console.error('❌ خطأ:', error.message)
  } finally {
    await client.end()
  }
}

main()
