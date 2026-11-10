// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Voting {

    struct Vote {
        uint256 electionId;
        uint256 candidateId;
        uint256 timestamp;
    }

    Vote[] public votes;

    event VoteRecorded(
        uint256 indexed electionId,
        uint256 indexed candidateId,
        uint256 timestamp
    );

    function recordVote(
        uint256 electionId,
        uint256 candidateId
    ) public {

        votes.push(
            Vote(
                electionId,
                candidateId,
                block.timestamp
            )
        );

        emit VoteRecorded(
            electionId,
            candidateId,
            block.timestamp
        );
    }

    function getVoteCount() public view returns (uint256) {
        return votes.length;
    }

    function getVote(uint256 index)
        public
        view
        returns (
            uint256 electionId,
            uint256 candidateId,
            uint256 timestamp
        )
    {
        Vote memory vote = votes[index];

        return (
            vote.electionId,
            vote.candidateId,
            vote.timestamp
        );
    }
}