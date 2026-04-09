#!/usr/bin/env python3
"""
Seed script: creates a demo user and sample transcripts for quick testing.
Usage:
    cd backend && python -m scripts.seed_demo
"""
import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext
from sqlalchemy import select

from app.database import init_db, async_session
from app.models.user import User
from app.models.meeting import Meeting

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_USER = {
    "email": "demo@meetinghub.ai",
    "full_name": "Demo User",
    "password": "demo1234",
    "role": "admin",
}

SAMPLE_TRANSCRIPTS = [
    {
        "title": "Q4 Product Strategy Review",
        "project_name": "Product",
        "filename": "q4_strategy_review.txt",
        "raw_text": """Meeting Date: 2026-03-15
Participants: Sarah Chen, Mike Johnson, Lisa Wong, David Kim

Sarah Chen: Good morning everyone. Let's review our Q4 roadmap. We have three major initiatives to discuss today.

Mike Johnson: Thanks Sarah. I'd like to start with the mobile app redesign. Our user research shows a 40% drop-off at the onboarding screen. We need to simplify the flow.

Lisa Wong: I agree with Mike. I've been looking at the analytics and the data supports this. I think we should reduce onboarding from 5 steps to 3.

Sarah Chen: That sounds like a good approach. Let's make that a priority. Mike, can you have the design mockups ready by next Friday?

Mike Johnson: Absolutely. I'll work with the design team and have them ready by March 22nd.

David Kim: On the backend side, we need to discuss the API migration. We're currently running 30% of traffic through the new GraphQL API and it's performing well.

Sarah Chen: Great progress David. What's the timeline for full migration?

David Kim: I think we can hit 100% by April 15th if we get two more engineers on the project.

Lisa Wong: I can reassign Chen and Priya from the analytics team. They have the right experience.

Sarah Chen: Decision made. Let's move them over starting next Monday. Now, regarding the AI features - where are we on the recommendation engine?

Mike Johnson: The MVP is ready. We're seeing a 15% improvement in click-through rates in our A/B test. I recommend we roll it out to all users next week.

Lisa Wong: The metrics look solid. I support a full rollout but let's keep monitoring for two weeks after launch.

Sarah Chen: Agreed. Let's plan the rollout for March 20th with a two-week monitoring period. David, make sure we have proper alerting in place.

David Kim: Will do. I'll set up PagerDuty alerts for any anomalies in the recommendation service.

Sarah Chen: Perfect. To summarize - three key decisions today: simplify mobile onboarding, complete API migration by April 15th, and roll out recommendation engine March 20th. Great meeting everyone.
""",
    },
    {
        "title": "Engineering Sprint Retrospective",
        "project_name": "Engineering",
        "filename": "sprint_retro.txt",
        "raw_text": """Sprint 24 Retrospective - 2026-03-20
Team: Alex Rivera, Jordan Blake, Sam Patel, Casey Liu

Alex Rivera: Welcome everyone to our Sprint 24 retro. Let's start with what went well.

Jordan Blake: The deployment pipeline improvements were huge. We reduced deployment time from 45 minutes to 12 minutes. That's a 73% improvement.

Sam Patel: I'm really happy with that too. Also, the new code review process helped catch three critical bugs before they reached production.

Casey Liu: From my side, the monitoring dashboards we built are amazing. We caught the memory leak in the payment service within minutes instead of hours.

Alex Rivera: Great highlights. Now let's discuss what didn't go well.

Jordan Blake: Honestly, the sprint planning was off. We overcommitted by about 30%. We planned for 80 story points but only delivered 56.

Sam Patel: I think part of the problem was unclear requirements on the user profile feature. We had to go back to product three times for clarification.

Casey Liu: I struggled with the third-party API integration. The documentation was terrible and there was no sandbox environment. I spent two days just debugging authentication.

Alex Rivera: These are valid concerns. Let's talk about action items. Jordan, can you work with Sarah to improve our estimation process?

Jordan Blake: Yes, I'll schedule a calibration session for next Wednesday. We should use reference stories for better point estimates.

Alex Rivera: Sam, regarding requirements - let's implement a requirement sign-off checklist before stories enter the sprint.

Sam Patel: I'll draft the checklist by Friday and share it with the product team for feedback.

Casey Liu: For the API integration issues, I'll create a vendor evaluation rubric that includes documentation quality and developer experience as criteria.

Alex Rivera: Perfect. One more thing - I'd like us to adopt pair programming for complex features. It helped a lot on the auth refactor.

Jordan Blake: Agreed. Let's dedicate at least 20% of sprint time to pairing sessions.

Alex Rivera: Decision made. Thanks everyone for a productive retro!
""",
    },
    {
        "title": "Budget Planning FY2027",
        "project_name": "Finance",
        "filename": "budget_planning.txt",
        "raw_text": """Budget Planning Meeting - FY2027
Date: 2026-04-01
Attendees: Rachel Torres (CFO), Mark Stevens (VP Eng), Nina Patel (VP Product), Tom Chen (VP Sales)

Rachel Torres: Good afternoon. We're here to finalize the FY2027 budget allocation. Total proposed budget is $12.5M across all departments.

Mark Stevens: Engineering is requesting $5.2M, up 15% from last year. The increase is primarily for cloud infrastructure scaling and hiring 8 new engineers.

Rachel Torres: That's a significant increase. Can you justify the cloud costs?

Mark Stevens: Our user base grew 200% this year. We're projecting another 150% growth. Without the infrastructure investment, we'll hit capacity issues by Q2.

Nina Patel: Product is requesting $3.1M. Most of it goes to UX research and the new AI features initiative. We want to hire a dedicated ML team of 4 people.

Tom Chen: Sales needs $2.8M. We're expanding into APAC and need regional sales managers plus marketing spend for brand awareness.

Rachel Torres: Let me be honest - we only have $11M approved by the board, not $12.5M. We need to cut $1.5M somewhere.

Mark Stevens: I can reduce cloud costs by $400K if we negotiate better reserved instances and optimize our Kubernetes clusters.

Nina Patel: I can defer two hire positions to Q3, saving about $300K in the first half.

Tom Chen: I can cut marketing spend by $200K and focus on organic growth through partnerships instead.

Rachel Torres: That gets us to $11.6M. We need another $600K in cuts.

Mark Stevens: What if we share the ML team between engineering and product? That would eliminate duplicate positions and save around $350K.

Nina Patel: I'm open to that. We can create a centralized AI team that serves both departments.

Rachel Torres: Good. And the remaining $250K - let's reduce the travel budget across all departments by 15%. We've proven remote meetings work well.

Tom Chen: Agreed, though I'd like an exception for the APAC launch trip.

Rachel Torres: Fair enough. Exception approved. So our final budget: Engineering $4.8M, Product $2.8M, Sales $2.6M, shared AI team included. Decision is final. I'll present to the board next week.
""",
    },
]


async def seed():
    """Create demo user and sample meetings."""
    await init_db()

    async with async_session() as session:
        async with session.begin():
            # Check if demo user exists
            result = await session.execute(
                select(User).where(User.email == DEMO_USER["email"])
            )
            user = result.scalar_one_or_none()

            if not user:
                user = User(
                    email=DEMO_USER["email"],
                    full_name=DEMO_USER["full_name"],
                    hashed_password=pwd_ctx.hash(DEMO_USER["password"]),
                    role=DEMO_USER["role"],
                )
                session.add(user)
                await session.flush()
                await session.refresh(user)
                print(f"✅ Created demo user: {DEMO_USER['email']} / {DEMO_USER['password']}")
            else:
                print(f"ℹ️  Demo user already exists: {DEMO_USER['email']}")

            # Create sample meetings
            for transcript in SAMPLE_TRANSCRIPTS:
                existing = await session.execute(
                    select(Meeting).where(
                        Meeting.user_id == user.id,
                        Meeting.filename == transcript["filename"],
                    )
                )
                if existing.scalar_one_or_none():
                    print(f"ℹ️  Meeting '{transcript['title']}' already exists, skipping.")
                    continue

                words = transcript["raw_text"].split()
                # Simple speaker detection
                import re
                speakers = set()
                for line in transcript["raw_text"].splitlines():
                    m = re.match(r"^([A-Z][A-Za-z\s]+?)[\:\-]\s", line.strip())
                    if m:
                        speakers.add(m.group(1).strip())

                meeting = Meeting(
                    user_id=user.id,
                    title=transcript["title"],
                    project_name=transcript["project_name"],
                    filename=transcript["filename"],
                    file_path=f"./data/uploads/{user.id}/{transcript['filename']}",
                    file_type="txt",
                    word_count=len(words),
                    speaker_count=len(speakers),
                    speakers=json.dumps(list(speakers)),
                    duration_minutes=0.0,
                    raw_text=transcript["raw_text"],
                    status="uploaded",
                )
                session.add(meeting)
                print(f"✅ Created meeting: {transcript['title']}")

    print("\n🎉 Seed complete! Login with: demo@meetinghub.ai / demo1234")


if __name__ == "__main__":
    asyncio.run(seed())
