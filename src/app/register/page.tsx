'use client';
import { useState } from 'react';

export default function Register() {
  const [cid, setCid] = useState('');
  return (
    <main className="p-6">
      <h2 className="text-xl font-medium">Register CID</h2>
      <div className="mt-4 space-y-2">
        <input
          className="border rounded p-2 w-full"
          placeholder="CIDv1"
          value={cid}
          onChange={(e) => setCid(e.target.value)}
        />
        <button className="px-3 py-2 bg-black text-white rounded">Register (stub)</button>
      </div>
    </main>
  );
}
