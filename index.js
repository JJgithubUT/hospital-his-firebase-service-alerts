import { app } from "./src/app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Servicio de alertas escuchando en el puerto ${PORT}`);
});
