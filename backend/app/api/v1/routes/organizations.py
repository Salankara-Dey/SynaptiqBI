"""
Organization API routes — multi-tenant management.

All operations require authentication. Organization creation auto-assigns
the creator as owner. Member management requires admin+ role.
"""
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.domains.identity.schemas import (
    CreateOrganizationRequest, OrganizationResponse,
    InviteMemberRequest, MemberResponse,
)
from app.db.models.organization import MemberRole
from app.domains.identity.services.organization_service import (
    create_organization, list_user_organizations,
    get_org_membership, require_org_role,
    add_member, remove_member, get_organization_members,
)

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.post("/", response_model=OrganizationResponse, status_code=201)
async def create_org(
    payload: CreateOrganizationRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    org = await create_organization(payload.name, uuid.UUID(user_id), db)
    return OrganizationResponse(
        id=org.id, name=org.name, slug=org.slug,
        role="owner", created_at=org.created_at,
    )


@router.get("/", response_model=list[OrganizationResponse])
async def list_orgs(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    orgs = await list_user_organizations(uuid.UUID(user_id), db)
    return [OrganizationResponse(**o) for o in orgs]


@router.get("/{org_id}/members", response_model=list[MemberResponse])
async def list_members(
    org_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await get_org_membership(uuid.UUID(user_id), org_id, db)
    members = await get_organization_members(org_id, db)
    return [MemberResponse(**m) for m in members]


@router.post("/{org_id}/members", response_model=MemberResponse, status_code=201)
async def invite_member(
    org_id: uuid.UUID,
    payload: InviteMemberRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await require_org_role(uuid.UUID(user_id), org_id, MemberRole.ADMIN, db)
    membership = await add_member(org_id, payload.email, MemberRole(payload.role), db)

    from app.db.models.user import User
    user = await db.get(User, membership.user_id)

    return MemberResponse(
        user_id=membership.user_id,
        email=user.email,
        full_name=user.full_name,
        role=membership.role.value,
        joined_at=membership.created_at,
    )


@router.delete("/{org_id}/members/{target_user_id}", status_code=204)
async def delete_member(
    org_id: uuid.UUID,
    target_user_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await require_org_role(uuid.UUID(user_id), org_id, MemberRole.ADMIN, db)
    await remove_member(org_id, target_user_id, db)
