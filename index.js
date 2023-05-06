require("dotenv").config();
const uuid = require("uuid");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

const app = express();
app.use(express.static("build"));
app.use(express.json());
app.use(cors());

// create a custom token to log the request body
morgan.token("req-body", (req) => JSON.stringify(req.body));
app.use(
  morgan(
    ":method :url :status :res[content-length] - :response-time ms :req-body"
  )
);

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: "unknown endpoint" });
};
app.use(unknownEndpoint);

const errorHandler = (error, req, res, next) => {
  console.log(error.message);

  if (error.name === "CastError") {
    res.statusMessage = `Malformatted id: ${error.value}`;
  } else if (error.name === "ValidationError") {
    res.statusMessage = error.message;
  }

  res.status(400).end();

  next(error);
};
app.use(errorHandler);

// mongoose

const Person = require("./models/person");

// const persons = [
//   {
//     id: "1",
//     name: "Arto Hellas",
//     number: "040-123456",
//   },
//   {
//     id: "2",
//     name: "Ada Lovelace",
//     number: "39-44-5323523",
//   },
//   {
//     id: "3",
//     name: "Dan Abramov",
//     number: "12-43-234345",
//   },
//   {
//     id: "4",
//     name: "Mary Poppendieck",
//     number: "39-23-6423122",
//   },
// ];

app.get("/api/persons", (req, res) => {
  Person.find({}).then((persons) => {
    res.json(persons);
    mongoose.connection.close();
  });
});

app.get("/info", (req, res) => {
  Person.find({}).then((persons) => {
    const date = new Date();
    res.send(
      `<p>Phonebook has info for ${persons.length} people</p><p>${date}</p>`
    );
    mongoose.connection.close();
  });
});

app.get("/api/persons/:id", (req, res, next) => {
  const id = req.params.id;

  Person.findById({ id: id })
    .then((person) => {
      if (person.length === 0) {
        res.statusMessage = `Person with id ${id} not found`;
        res.status(404).end();
      }

      res.json(person);
      mongoose.connection.close();
    })
    .catch((error) => {
      next(error);
    });
});

app.delete("/api/persons/:id", (req, res) => {
  const id = req.params.id;

  Person.findByIdAndDelete({ id: id })
    .then((result) => {
      console.log(result);
      res.status(204).end();
      mongoose.connection.close();
    })
    .catch((error) => {
      next(error);
    });
  // const person = persons.find((p) => p.id === id);

  // if (person) {
  //   persons.splice(persons.indexOf(person), 1);
  //   res.status(204).end();
  // } else {
  //   res.statusMessage = `Person with id ${id} not found`;
  //   res.status(404).end();
  // }
});

app.post("/api/persons", (req, res) => {
  const body = req.body;

  if (!body.name || !body.number) {
    res.statusMessage = "Name or number missing";
    res.status(400).end();
  }

  Person.find({ name: body.name }).then((result) => {
    if (result.length > 0) {
      res.statusMessage = "Name must be unique";
      res.status(400).end();
    }
  });

  const person = new Person({
    id: uuid.v4(),
    name: body.name,
    number: body.number,
  });

  person.save().then((result) => {
    console.log(`added ${person.name} number ${person.number} to phonebook`);
    mongoose.connection.close();
  });

  // if (!body.name || !body.number) {
  //   res.statusMessage = "Name or number missing";
  //   res.status(400).end();
  // } else if (persons.find((p) => p.name === body.name)) {
  //   res.statusMessage = "Name must be unique";
  //   res.status(400).end();
  // } else {
  //   const person = {
  //     id: uuid.v4(),
  //     name: body.name,
  //     number: body.number,
  //   };

  //   persons.push(person);
  //   res.json(person);
  // }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
