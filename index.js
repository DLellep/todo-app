const express = require('express')
const app = express()
app.use(express.json());
const swaggerUi = require('swagger-ui-express');
require('dotenv').config()
YAML = require('yamljs');
const swaggerDocument = YAML.load('swagger.yml');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(express.static(__dirname + '/public'));

let sessions = [
    {sessionToken: '123', userId: 1}
];
const users = [
    {username: 'admin', password: 'p', isAdmin: true, id: 1},
    {username: 'user', password: 'p', isAdmin: false, id: 2}
];
let tasks = [];

app.post('/sessions', (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).send({error: 'One or all params are missing'})
    }
    const user = users.find((user) => user.username === req.body.username && user.password === req.body.password);
    if (!user) {
        return res.status(401).send({error: 'Unauthorized: username or password is incorrect'})
    }
    //generate 32 character random string
    const sessionToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);


    let newSession = {
        sessionToken: sessionToken,
        userId: user.id
    }
    sessions.push(newSession)
    res.status(201).send(
        {sessionToken: sessionToken}
    )
})

// Endpoint for getting all tasks
app.get('/tasks', requireAuth, (req, res) => {
    res.send(tasks.filter((task) => task.userId === req.user.id))
})


app.delete('/sessions', requireAuth, (req, res) => {
    sessions = sessions.filter((session) => session.sessionToken === req.sessionToken);
    res.status(204).end()
})
app.listen(process.env.PORT, () => {
    console.log(`App running at http://localhost:${process.env.PORT}. Documentation at http://localhost:${process.env.PORT}/docs`)
})
app.use(function (err, req, res, next) {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).send({error: err.message});
});

//Endpoint for creating a new task
app.post('/tasks', requireAuth, (req, res) => {
    if (!req.body.name || !req.body.dueDate || !req.body.description) {
        return res.status(400).send({error: 'One or all params are missing'})
    }
    let newTask = {
        id: tasks.length + 1,
        name: req.body.name,
        dueDate: req.body.dueDate,
        description: req.body.description,
        userId: req.user.id
    }
    tasks.push(newTask)
    res.status(201).send(
        newTask
    )
})

//Endpoint for deleting a task
app.delete('/tasks/:id', requireAuth, (req, res) => {
    const task = tasks.find((task) => task.id === parseInt(req.params.id));
    if (!task) {
        return res.status(404).send({error: 'Task not found'})
    }
    if (task.userId !== req.user.id) {
        return res.status(403).send({error: 'Forbidden'})
    }
    tasks = tasks.filter((task) => task.id !== parseInt(req.params.id));
    res.status(204).end()
})

//endpoint to edit a task
app.put('/tasks/:id', requireAuth, (req, res) => {
    const task = tasks.find((task) => task.id === parseInt(req.params.id));
    if (!task) {
        return res.status(404).send({error: 'Task not found'})
    }
    if (task.userId !== req.user.id) {
        return res.status(403).send({error: 'Forbidden'})
    }
    if (!req.body.name || !req.body.dueDate || !req.body.description) {
        return res.status(400).send({error: 'One or all params are missing'})
    }
    task.name = req.body.name;
    task.dueDate = req.body.dueDate;
    task.description = req.body.description;
    res.status(200).send(task)
})



function requireAuth(req, res, next) {

    if (!req.headers.authorization) {
        return res.status(401).send({error: 'Missing authorization header'})
    }

    if (!req.headers.authorization.startsWith('Bearer ')) {
        return res.status(401).send({error: 'Authorization header must start with Bearer followed by a space and the session sessionToken'})
    }

    const sessionToken = req.headers.authorization.split(' ')[1];
    const session = sessions.find((session) => session.sessionToken === sessionToken);

    if (!session) {
        return res.status(401).send({error: 'Invalid session'})
    }

    const user = users.find((user) => user.id === session.userId);

    if (!user) {
        return res.status(401).send({error: 'Invalid user'})
    }

    req.user = user;
    req.sessionToken = sessionToken;

    next()
}