"""
Organization domain service — CRUD + membership management.

Organizations provide multi-tenant scoping. When a user registers, a
personal organization is auto-created. Users can create additional orgs
and invite members with role-based permissions.
"""
import uuid
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException, status

from app.db.models.user import User
from app.db.models.organization import Organization, Membership, MemberRole, ROLE_HIERARCHY


def _slugify(name: str) -> str:
    """Generate a URL-safe slug from an organization name."""
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "org"


async def create_organization(name: str, owner_id: uuid.UUID, db: AsyncSession) -> Organization:
    """Create a new organization and assign the creator as owner."""
    base_slug = _slugify(name)

    # Ensure slug uniqueness by appending a counter if needed
    slug = base_slug
    counter = 1
    while await db.scalar(select(Organization).where(Organization.slug == slug)):
        slug = f"{base_slug}-{counter}"
        counter += 1

    org = Organization(name=name.strip(), slug=slug)
    db.add(org)
    await db.flush()

    membership = Membership(
        user_id=owner_id,
        organization_id=org.id,
        role=MemberRole.OWNER,
    )
    db.add(membership)
    await db.flush()

    return org


async def list_user_organizations(user_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """List all organizations a user belongs to, with their role."""
    result = await db.execute(
        select(Organization, Membership.role)
        .join(Membership, Membership.organization_id == Organization.id)
        .where(Membership.user_id == user_id)
        .order_by(Organization.name)
    )
    return [
        {
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "role": role.value,
            "created_at": org.created_at,
        }
        for org, role in result.all()
    ]


async def get_org_membership(
    user_id: uuid.UUID, org_id: uuid.UUID, db: AsyncSession,
) -> Membership:
    """Return the user's membership in an org, or raise 403."""
    membership = await db.scalar(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.organization_id == org_id,
        )
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )
    return membership


async def require_org_role(
    user_id: uuid.UUID, org_id: uuid.UUID, min_role: MemberRole, db: AsyncSession,
) -> Membership:
    """Check that the user has at least min_role in the org."""
    membership = await get_org_membership(user_id, org_id, db)
    if ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[min_role]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires at least '{min_role.value}' role",
        )
    return membership


async def add_member(
    org_id: uuid.UUID, email: str, role: MemberRole, db: AsyncSession,
) -> Membership:
    """Add a user to an organization by email."""
    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email '{email}'",
        )

    existing = await db.scalar(
        select(Membership).where(
            Membership.user_id == user.id,
            Membership.organization_id == org_id,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this organization",
        )

    membership = Membership(
        user_id=user.id,
        organization_id=org_id,
        role=role,
    )
    db.add(membership)
    await db.flush()
    return membership


async def remove_member(
    org_id: uuid.UUID, target_user_id: uuid.UUID, db: AsyncSession,
) -> None:
    """Remove a user from an organization."""
    membership = await db.scalar(
        select(Membership).where(
            Membership.user_id == target_user_id,
            Membership.organization_id == org_id,
        )
    )
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )
    if membership.role == MemberRole.OWNER:
        # Check if there's at least one other owner
        owner_count = await db.scalar(
            select(func.count()).select_from(Membership).where(
                Membership.organization_id == org_id,
                Membership.role == MemberRole.OWNER,
            )
        )
        if owner_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last owner of an organization",
            )
    await db.delete(membership)


async def get_organization_members(org_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    """List all members of an organization."""
    result = await db.execute(
        select(User, Membership.role, Membership.created_at)
        .join(Membership, Membership.user_id == User.id)
        .where(Membership.organization_id == org_id)
        .order_by(Membership.created_at)
    )
    return [
        {
            "user_id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": role.value,
            "joined_at": joined_at,
        }
        for user, role, joined_at in result.all()
    ]
