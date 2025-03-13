import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';

export async function syncBlockchainData(contract: ethers.Contract) {
  try {
    console.log('Starting blockchain data sync...');

    // Get verified users count from blockchain events
    const verificationFilter = contract.filters.AadhaarVerified();
    const verificationEvents = await contract.queryFilter(verificationFilter);
    const totalVerifiedUsers = verificationEvents.length;

    // Get candidates from blockchain
    const candidates = await contract.getCandidates();
    console.log('Fetched candidates from blockchain:', candidates);

    // First, clear existing data to avoid duplicates
    await supabase.from('candidates').delete().neq('id', 0);
    await supabase.from('election_stats').delete().neq('id', 0);

    // Update election stats
    const { error: statsError } = await supabase
      .from('election_stats')
      .upsert({
        id: 1, // Single row
        total_eligible_voters: totalVerifiedUsers,
        total_verified_users: totalVerifiedUsers,
        last_sync: new Date().toISOString()
      });

    if (statsError) {
      console.error('Error updating election stats:', statsError);
      throw statsError;
    }

    // Update candidates
    for (const candidate of candidates) {
      const { error: candidateError } = await supabase
        .from('candidates')
        .upsert({
          id: candidate.id.toNumber(),
          name: candidate.name,
          party: candidate.party,
          description: candidate.description,
          vote_count: candidate.voteCount.toNumber(),
          last_sync: new Date().toISOString(),
          // Add default values for additional fields
          background: `${candidate.name} is a dedicated public servant with extensive experience in governance and policy making.`,
          agenda: [
            'Strengthen democratic institutions',
            'Promote economic growth',
            'Enhance public services'
          ],
          experience: [
            'Public Service',
            'Community Leadership',
            'Policy Development'
          ]
        });

      if (candidateError) {
        console.error('Error updating candidate:', candidateError);
        throw candidateError;
      }
    }

    // Update voter demographics if needed
    const { error: demographicsError } = await supabase
      .from('voter_demographics')
      .upsert([
        { age_group: '18-25', percentage: 25 },
        { age_group: '26-35', percentage: 35 },
        { age_group: '36-50', percentage: 25 },
        { age_group: '51+', percentage: 15 }
      ]);

    if (demographicsError) {
      console.error('Error updating demographics:', demographicsError);
      throw demographicsError;
    }

    console.log('Blockchain data synced successfully');
    return true;
  } catch (error) {
    console.error('Error syncing blockchain data:', error);
    throw error;
  }
}

export async function initializeDemoData(contract: ethers.Contract) {
  try {
    // Check if we already have candidates in the blockchain
    const candidates = await contract.getCandidates();
    
    if (candidates.length > 0) {
      console.log('Candidates already exist in blockchain, syncing to database...');
      await syncBlockchainData(contract);
      return;
    }

    console.log('No candidates found, initializing demo data...');

    // Demo candidates data
    const demoCandidates = [
      {
        name: "Sarah Johnson",
        party: "Progressive Alliance",
        description: "Experienced leader focused on sustainable development and social justice"
      },
      {
        name: "Michael Chen",
        party: "Innovation Party",
        description: "Tech entrepreneur advocating for digital transformation and smart governance"
      },
      {
        name: "Emily Rodriguez",
        party: "Unity Coalition",
        description: "Community organizer committed to inclusive policies and education reform"
      },
      {
        name: "David Kumar",
        party: "Future Forward",
        description: "Environmental scientist promoting green initiatives and climate action"
      }
    ];

    // Add candidates to blockchain
    for (const candidate of demoCandidates) {
      console.log('Adding candidate to blockchain:', candidate.name);
      const tx = await contract.addCandidate(
        candidate.name,
        candidate.party,
        candidate.description
      );
      await tx.wait(2);
    }

    // Sync the newly added candidates with Supabase
    await syncBlockchainData(contract);

    console.log('Demo data initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing demo data:', error);
    throw error;
  }
} 