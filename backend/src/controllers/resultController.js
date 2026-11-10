
const { pool } = require("../config/database");

// GET RESULTS — only after release
const getResults = async (req, res) => {
    try {
        const { electionId } = req.params;

        if (!/^\d+$/.test(String(electionId)) || Number(electionId) < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid election ID"
            });
        }

        const [elections] = await pool.query(
            `SELECT id, title, status
             FROM elections
             WHERE id = ?`,
            [Number(electionId)]
        );

        if (elections.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Election not found"
            });
        }

        const election = elections[0];

        if (election.status !== "RESULTS_RELEASED") {
            return res.status(403).json({
                success: false,
                message: "Results have not been released yet"
            });
        }

        const [results] = await pool.query(
            `SELECT
                c.id AS candidate_id,
                c.name AS candidate_name,
                COUNT(v.id) AS vote_count
             FROM candidates c
             LEFT JOIN votes v
                ON c.id = v.candidate_id
             WHERE c.election_id = ?
             GROUP BY c.id, c.name
             ORDER BY vote_count DESC`,
            [Number(electionId)]
        );

        const formattedResults = results.map((result) => ({
            candidate_id: result.candidate_id,
            candidate_name: result.candidate_name,
            vote_count: Number(result.vote_count)
        }));

        return res.json({
            success: true,
            election: {
                id: election.id,
                title: election.title,
                status: election.status
            },
            results: formattedResults
        });
    } catch (error) {
        console.error("RESULT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch results"
        });
    }
};

module.exports = {
    getResults
};
