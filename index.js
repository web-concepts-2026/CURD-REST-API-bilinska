import Fastify from 'fastify';
import * as SQLite from 'node:sqlite'

const fastify = Fastify({
  logger: true
});


const db = new SQLite.DatabaseSync('./db.sqlite')
db.exec(`CREATE TABLE IF NOT EXISTS todo(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    isDone INTEGER) STRICT`)
// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})



fastify.get('/items', function(request, reply) {
    const list = db.prepare(`SELECT * FROM todo`).all()
    reply.send(list)
})

//new get
fastify.get('/items/:id', function(request, reply) {
    const {id} = request.params || {}
    if(!id || isNaN(id) || id < 1){
        reply.code(400).send('Bad Id provided')
        return
    }
    const item = db.prepare(`SELECT * FROM todo WHERE id= ?`).get(id)
    if(!item){
        reply.code(404).send('Item not found')
        return
    }
    reply.send(item)
})

fastify.post('/items', function(request, reply) {
    const { title } = request.body || {}
    if(!title){
        reply.code(400).send('No title provided')
        return
    }

    const result = db.prepare(`INSERT INTO todo values(?, ?, ?)`).run(null, title, 0)
    console.log(result)

    const lastData = db.prepare(`SELECT * FROM todo ORDER BY id DESC LIMIT 1`).get()
    reply.code(201).send(lastData)
})

fastify.delete('/items/:id', function(request, reply) {
    const {id} = request.params || {}
    if(!id || isNaN(id) || id < 1){
        reply.code(400).send('Bad Id provided')
        return
    }

    const res = db.prepare(`DELETE FROM todo WHERE id= ?`).run(id)
    if(res.changes > 0){
        reply.code(200).send('OK')
    } else{
        reply.code(400).send('Not deleted')
    }
    console.log(res)
})

fastify.patch('/items/:id', function(request, reply) {
    const {id} = request.params || {}
    if(!id || isNaN(id) || id < 1){
        reply.code(400).send('Bad Id provided')
        return
    }
    const item = db.prepare(`SELECT * FROM todo WHERE id= ?`).get(id)
    if(!item){
        reply.code(404).send('Item not found')
        return
    }

    const { title, isDone } = request.body || {}
    if(title == undefined && isDone == undefined){
        reply.code(400).send('Not changed')
        return
    }

    db.prepare(`UPDATE todo SET title = COALESCE(?, title), isDone = COALESCE(?, isDone) WHERE id= ?`).run(title ?? id, isDone ?? id, id)
    const changedItem = db.prepare(`SELECT * FROM todo WHERE id= ?`).get(id)
    reply.send(changedItem)
    }
)


fastify.put('/items/:id', function(request, reply) {
    const {id} = request.params || {}
    
    if(!id || isNaN(id) || id < 1){
        reply.code(400).send('Bad Id provided')
        return
    }

    const lastRow = db.prepare(`SELECT MAX(id) AS lastId FROM todo`).get()
    const lastId = lastRow.lastId || 0 //if there are no rows
    
    

    if(id > (lastId + 1)){
        reply.code(400).send(`Bad Id provided: max id you can use=${lastId + 1}`)
        return
    }
    

    const { title, isDone } = request.body || {}
    let responseCode = undefined;
    if(title == undefined || isDone == undefined){
        reply.code(400).send('Not created: null argument')
        return
    }
    else{
        const item = db.prepare(`SELECT * FROM todo WHERE id= ?`).get(id)
        if(!item){
            db.prepare(`INSERT INTO todo (id, title, isDone) VALUES(?, ?, ?)`).run(id, title, isDone)
            responseCode = 201;
        }
        else{
            db.prepare(`UPDATE todo SET title = ?, isDone = ? WHERE id= ?`).run(title, isDone, id)
            responseCode = 200;
        }   
        
    }

    const createdItem = db.prepare(`SELECT * FROM todo WHERE id= ?`).get(id)
    reply.code(responseCode).send(createdItem)
    }
)

// Run the server!
fastify.listen({ port: 3000 }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})