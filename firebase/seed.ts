
import { db } from './config';
// FIX: Use Firebase v9 compat import to support v8 syntax.
import firebase from 'firebase/compat/app';

export const seedAdminUser = async () => {
    const usersRef = db.collection("users");
    const fullPermissions = {
        view: true, create: true, edit: true, delete: true
    };
    
    // 1. Seed Admin User
    const adminEmail = 'admin@nafat';
    const adminQ = usersRef.where("email", "==", adminEmail);
    const adminQuerySnapshot = await adminQ.get();

    if (adminQuerySnapshot.empty) {
        console.log("Admin user not found, creating one...");
        const adminDocRef = db.collection("users").doc("admin_user_seed");
        await adminDocRef.set({
            user_id: 'admin_user_seed',
            name: 'Admin',
            email: adminEmail,
            password: 'nafat@01', 
            role: 'admin',
            permissions: {
                dashboard: fullPermissions,
                projects: fullPermissions,
                apartments: fullPermissions,
                clients: fullPermissions,
                contracts: fullPermissions,
                payments: fullPermissions,
                settings: fullPermissions
            },
            // Removed image URL to support letter avatar
            avatar_url: '', 
            last_login: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Admin user created.");
    }

    // 2. Seed Developer User (Owner)
    const devEmail = 'dev@dev';
    const devQ = usersRef.where("email", "==", devEmail);
    const devQuerySnapshot = await devQ.get();

    if (devQuerySnapshot.empty) {
        console.log("Developer user not found, creating one...");
        const devDocRef = db.collection("users").doc("dev_user_seed");
        await devDocRef.set({
            user_id: 'dev_user_seed',
            name: 'Developer',
            email: devEmail,
            password: '1234', 
            role: 'admin', // Role admin gives full access logic in code
            permissions: {
                dashboard: fullPermissions,
                projects: fullPermissions,
                apartments: fullPermissions,
                clients: fullPermissions,
                contracts: fullPermissions,
                payments: fullPermissions,
                settings: fullPermissions
            },
            avatar_url: '',
            last_login: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Developer user created.");
    }
};
