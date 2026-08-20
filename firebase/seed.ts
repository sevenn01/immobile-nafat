
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

    // 3. Seed Ghali 1 Project and Blueprint Units
    try {
        const projectsRef = db.collection("projects");
        const allProjectsSnap = await projectsRef.get();
        const allProjects = allProjectsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

        let mainGhali = allProjects.find(p => (p.project_name || '').toUpperCase() === 'GHALI 1' && p.id !== 'ghali_1_project_id');

        if (mainGhali) {
            // Delete duplicate seeded project if present
            const dupDoc = await projectsRef.doc('ghali_1_project_id').get();
            if (dupDoc.exists) {
                await projectsRef.doc('ghali_1_project_id').delete();
                console.log("Deleted duplicate seeded Ghali 1 project");
            }
            // Re-assign any orphaned apartments from ghali_1_project_id to the main GHALI 1 project
            const aptsRef = db.collection("apartments");
            const dupAptsSnap = await aptsRef.where("project_id", "==", "ghali_1_project_id").get();
            if (!dupAptsSnap.empty) {
                const batch = db.batch();
                dupAptsSnap.docs.forEach(doc => {
                    batch.update(doc.ref, { project_id: mainGhali.id });
                });
                await batch.commit();
                console.log("Migrated Ghali 1 apartments to main project:", mainGhali.id);
            }
        } else {
            // If no GHALI 1 project exists at all, create it as main
            const ghaliId = "ghali_1_project_id";
            const projectDocRef = projectsRef.doc(ghaliId);
            const now = new Date().toISOString();
            await projectDocRef.set({
                id: ghaliId,
                project_id: ghaliId,
                project_name: "GHALI 1",
                location: "AIN SBAA CASABLANCA",
                description: "Projet Immobilier Ghali 1 — Immeuble de Haut Standing R+4 avec Soupente et Magasins RDC",
                total_apartments: 18,
                num_floors: 4,
                has_rdc: true,
                status: "active",
                created_at: now,
                updated_at: now
            });
            console.log("Ghali 1 project seeded.");
        }
    } catch (e) {
        console.error("Ghali seed notice:", e);
    }
};
