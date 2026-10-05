/** Local mode always delegates /v1 to commerce. It must not start another authority. */
export async function handleCloudRequest() {
  return Response.json({error:{code:'AUTHORITY_UNAVAILABLE',message:'La API cloud no está habilitada en esta instalación.'}},{status:503,headers:{'Cache-Control':'no-store'}});
}
