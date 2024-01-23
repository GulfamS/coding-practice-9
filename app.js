const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')

const dbPath = path.join(__dirname, 'userData.db')

const app = express()
app.use(express.json())

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running at localhost://3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

//User Registration
app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)

  const checkUserName = `
        SELECT * 
        FROM user 
        WHERE username = '${username}';
    `
  const userData = await db.get(checkUserName)

  if (userData === undefined) {
    const newUserQuery = `
            INSERT INTO 
                user (username, name, password, gender, location)
            VALUES
                (
                    '${username}', '${name}', '${hashedPassword}', '${gender}', '${location}'
                );
        `
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      await db.run(newUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

//Login User
app.post('/login', async (request, response) => {
  const {username, password} = request.body

  const checkUserName = `
        SELECT * 
        FROM user 
        WHERE username = '${username}';
    `
  const userData = await db.get(checkUserName)

  if (userData === undefined) {
    //Invalid User
    response.status(400)
    response.send('Invalid user')
  } else {
    //check password
    const isPassMatch = await bcrypt.compare(password, userData.password)

    if (isPassMatch === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//Update User or Change Password
app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const selectUserQuery = `
    SELECT * 
    FROM user
    WHERE username = '${username}';
  `
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid User')
  } else {
    const isPassMatch = await bcrypt.compare(oldPassword, dbUser.password)

    if (isPassMatch === true) {
      if (newPassword.length > 5) {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const updatedPasswordQuery = `
          UPDATE user
          SET 
            password = '${hashedPassword}'
          WHERE 
            username = '${username}';
        `
        const user = await db.run(updatedPasswordQuery)
        response.status(200)
        response.send('Password updated')
      } else {
        response.status(400)
        response.send('Password is too short')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})
module.exports = app
