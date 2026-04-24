import { NextRequest, NextResponse } from 'next/server'
import * as admin from 'firebase-admin'
import { adminDb } from '@/lib/firebase/admin'

const RULES_SOURCE = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }
    function isOwnerByField() {
      return isAuth() && request.auth.uid == resource.data.user_id;
    }
    function isOwnerByFieldOnCreate() {
      return isAuth() && request.auth.uid == request.resource.data.user_id;
    }

    match /profiles/{uid} {
      allow read, write: if isAuth() && request.auth.uid == uid;
    }
    match /settings/{uid} {
      allow read, write: if isAuth() && request.auth.uid == uid;
    }
    match /habits/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /habit_logs/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /events/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /event_logs/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /tasks/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /goals/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /notifications/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /categories/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
    match /finance_entries/{docId} {
      allow read, update, delete: if isOwnerByField();
      allow create: if isOwnerByFieldOnCreate();
    }
  }
}
`

export async function POST(req: NextRequest) {
  try {
    const apps = admin.apps
    if (!apps.length) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 })
    }

    const securityRules = admin.securityRules()

    // Create new ruleset
    const fileSource = securityRules.createRulesFileSource('firestore.rules', RULES_SOURCE)
    const newRuleset = await securityRules.createRuleset(fileSource)

    // Release it as the active Firestore ruleset
    await securityRules.releaseFirestoreRuleset(newRuleset)

    return NextResponse.json({
      success: true,
      message: 'Firestore security rules updated successfully',
      rulesetName: newRuleset.name,
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      code: err.code,
    }, { status: 500 })
  }
}

// GET returns the current active rules for verification
export async function GET(req: NextRequest) {
  try {
    const securityRules = admin.securityRules()
    const release = await securityRules.getFirestoreRuleset()
    return NextResponse.json({
      name: release.name,
      createTime: release.createTime,
      files: release.source.map((f: any) => ({ name: f.name, contentLength: f.content?.length })),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 500 })
  }
}
