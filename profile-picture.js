const PROFILE_PICTURE_BUCKET = "profile-pictures";
const DEFAULT_PROFILE_PICTURE = new URL(
  "Pictures/UserDefaultPicture.jpg",
  window.location.href,
).href;
const PROFILE_PICTURE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024;

window.setProfilePicture = (image, avatarPath) => {
  image.addEventListener("error", () => {
    if (image.src !== DEFAULT_PROFILE_PICTURE) {
      image.src = DEFAULT_PROFILE_PICTURE;
    }
  });
  image.src = avatarPath
    ? window.supabaseClient.storage
        .from(PROFILE_PICTURE_BUCKET)
        .getPublicUrl(avatarPath).data.publicUrl
    : DEFAULT_PROFILE_PICTURE;
};

window.createProfilePictureEditor = ({ userId, image, input, button, status }) => {
  let currentPath = null;

  const setAvatarPath = (path) => {
    currentPath = path;
    window.setProfilePicture(image, path);
  };

  button.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) {
      return;
    }

    const extension = PROFILE_PICTURE_TYPES[file.type];
    if (!extension) {
      status.textContent = "Choose a JPG, PNG, or WebP image.";
      status.hidden = false;
      input.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_PICTURE_SIZE) {
      status.textContent = "Choose an image that is 5 MB or smaller.";
      status.hidden = false;
      input.value = "";
      return;
    }

    button.disabled = true;
    status.textContent = "Uploading picture…";
    status.hidden = false;
    const bucket = window.supabaseClient.storage.from(PROFILE_PICTURE_BUCKET);
    const uploadedPath = `${userId}/${window.crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await bucket.upload(uploadedPath, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        throw new Error(`Unable to upload your picture: ${uploadError.message}`);
      }

      const { data: updatedProfile, error: profileError } =
        await window.supabaseClient
          .from("profiles")
          .update({ avatar_path: uploadedPath })
          .eq("id", userId)
          .select("id")
          .maybeSingle();

      if (profileError) {
        const { error: cleanupError } = await bucket.remove([uploadedPath]);
        const cleanupMessage = cleanupError
          ? ` The uploaded file could not be cleaned up: ${cleanupError.message}`
          : "";
        throw new Error(
          `The picture uploaded, but your profile could not be updated: ${profileError.message}.${cleanupMessage}`,
        );
      }
      if (!updatedProfile) {
        const { error: cleanupError } = await bucket.remove([uploadedPath]);
        const cleanupMessage = cleanupError
          ? ` The uploaded file could not be cleaned up: ${cleanupError.message}`
          : "";
        throw new Error(
          `The picture uploaded, but no profile record was updated.${cleanupMessage}`,
        );
      }

      const previousPath = currentPath;
      setAvatarPath(uploadedPath);
      status.textContent = "Profile picture updated.";

      if (previousPath && previousPath !== uploadedPath) {
        const { error: removeError } = await bucket.remove([previousPath]);
        if (removeError) {
          status.textContent =
            `Picture updated, but the previous picture could not be removed: ${removeError.message}`;
        }
      }
    } catch (error) {
      status.textContent = error.message;
    } finally {
      input.value = "";
      button.disabled = false;
    }
  });

  return { setAvatarPath };
};
