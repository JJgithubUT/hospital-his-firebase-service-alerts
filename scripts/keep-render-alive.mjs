import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount =
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const app = initializeApp({
    credential: cert(serviceAccount)
});

const firestore =
    getFirestore(app);

const COLLECTION =
    "hospital-his-firebase-service-configs";

const DOCUMENT =
    "configurations";

const renderUrl =
    process.env.RENDER_SERVICE_URL;

if (!renderUrl) {
    throw new Error(
        "Falta RENDER_SERVICE_URL"
    );
}

const snapshot =
    await firestore
        .collection(COLLECTION)
        .doc(DOCUMENT)
        .get();

if (!snapshot.exists) {
    console.log(
        "No existe el documento de configuración."
    );

    process.exit(0);
}

const config =
    snapshot.data();

const active =
    config["active-service"] === true;

console.log(
    `active-service = ${active}`
);

if (!active) {
    console.log(
        "Servicio desactivado. No se hará ping a Render."
    );

    process.exit(0);
}

console.log(
    `Servicio activo. Despertando Render: ${renderUrl}/health`
);

const response =
    await fetch(
        `${renderUrl}/health`,
        {
            method: "GET",
            headers: {
                "User-Agent":
                    "hospital-his-render-keepalive"
            }
        }
    );

console.log(
    `Render respondió HTTP ${response.status}`
);

if (!response.ok) {
    const body =
        await response.text();

    console.error(
        "Respuesta de Render:",
        body
    );

    process.exit(1);
}